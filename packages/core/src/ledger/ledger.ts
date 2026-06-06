import { db, Prisma } from '@markaz/db';
import type { Ledger, PostingInput, PostingResult } from './types';
import { isAccountCode } from './accounts';
import {
  AmountScaleError,
  InsufficientLinesError,
  InvalidAmountError,
  UnbalancedPostingError,
  UnknownAccountError,
  ZeroAmountLineError,
} from './errors';

/**
 * Double-entry ledger. Exposes exactly one mutating method (post). Postings
 * are append-only at the API surface; corrections are NEW postings, not
 * mutations of existing rows. DB-level REVOKE UPDATE/DELETE deferred to the
 * security pass — until then the engine + ledger going through their typed
 * APIs is the contract.
 */
export function createLedger(): Ledger {
  return {
    async post(input: PostingInput): Promise<PostingResult> {
      // --- Validation: all outside any DB call, cheapest first. ---
      validate(input);

      // --- Idempotency pre-check: fast path for retries. ---
      // Outside the tx; the unique constraint below handles the race window.
      if (input.idempotencyKey !== undefined) {
        const existing = await db.posting.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { lines: true },
        });
        if (existing) return toResult(existing);
      }

      // --- Atomic write. Prisma's nested create wraps Posting + every
      //     PostingLine in a single DB transaction; all rows or none. ---
      try {
        const created = await db.posting.create({
          data: {
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            description: input.description,
            actorId: input.actorId,
            // Conditional spread for optional fields: exactOptionalPropertyTypes
            // means Prisma's input types don't accept `undefined` directly.
            ...(input.idempotencyKey !== undefined
              ? { idempotencyKey: input.idempotencyKey }
              : {}),
            ...(input.currency !== undefined ? { currency: input.currency } : {}),
            lines: {
              create: input.lines.map((l) => ({
                accountCode: l.accountCode,
                amount: l.amount,
              })),
            },
          },
          include: { lines: true },
        });
        return toResult(created);
      } catch (err) {
        // Race: another caller won the idempotency key between our pre-check
        // and our insert. Unique constraint catches it (P2002). Hardened to
        // check the specific constraint target so a future unique column on
        // posting can't silently get treated as an idempotency win.
        if (
          input.idempotencyKey !== undefined &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          Array.isArray(err.meta?.['target']) &&
          (err.meta['target'] as string[]).includes('idempotency_key')
        ) {
          const winner = await db.posting.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
            include: { lines: true },
          });
          if (winner) return toResult(winner);
        }
        throw err;
      }
    },
  };
}

/**
 * Pure validation of a PostingInput. Exported so unit tests can verify each
 * rule in isolation without mocking the DB.
 *
 * Order matters; checks run cheapest first. The amount-format checks (parse,
 * scale) MUST run before the balance check so the in-app sum runs at the same
 * 2dp scale that gets stored. Worked example: +0.014 + +0.014 + -0.028 sums
 * to 0 in app but rounds to 0.01 + 0.01 + -0.03 = -0.01 on disk.
 *
 * Amounts are parsed exactly once via Prisma.Decimal and the parsed values
 * are reused for the scale, zero, and balance checks — avoids re-parsing the
 * same string three times and keeps every check on the same Decimal value.
 */
export function validate(input: PostingInput): void {
  // 1. At least 2 lines.
  if (input.lines.length < 2) {
    throw new InsufficientLinesError(input.lines.length);
  }

  // 2. Every line's accountCode is in the registry.
  for (const line of input.lines) {
    if (!isAccountCode(line.accountCode)) {
      throw new UnknownAccountError(line.accountCode);
    }
  }

  // 3. Parse every amount once. Bad input ('abc', '', etc.) throws
  //    InvalidAmountError — distinct from AmountScaleError so callers can
  //    discriminate "not a number" from "too precise."
  const parsed: Prisma.Decimal[] = [];
  for (const [index, line] of input.lines.entries()) {
    let amount: Prisma.Decimal;
    try {
      amount = new Prisma.Decimal(line.amount);
    } catch {
      throw new InvalidAmountError(line.accountCode, line.amount, index);
    }
    parsed.push(amount);
  }

  // 4. decimalPlaces() > 2 caught here — covers literal '0.014' AND scientific
  //    notation like '15e-4' (= 0.0015 = 4dp), which a string-split would miss.
  for (const [index, line] of input.lines.entries()) {
    if (parsed[index]!.decimalPlaces() > 2) {
      throw new AmountScaleError(line.accountCode, line.amount, index);
    }
  }

  // 5. Every line non-zero. Decimal.isZero() handles '0', '0.00', '+0', '-0'.
  for (const [index, line] of input.lines.entries()) {
    if (parsed[index]!.isZero()) {
      throw new ZeroAmountLineError(line.accountCode, index);
    }
  }

  // 6. SUM(amount) = 0. Decimal arithmetic is exact at the 2dp scale
  //    guaranteed by check #4.
  const sum = parsed.reduce((acc, amount) => acc.plus(amount), new Prisma.Decimal(0));
  if (!sum.isZero()) {
    throw new UnbalancedPostingError(sum.toString());
  }
}

type PostingRow = Prisma.PostingGetPayload<{ include: { lines: true } }>;

function toResult(posting: PostingRow): PostingResult {
  return {
    postingId: posting.id,
    lines: posting.lines.map((l) => ({
      id: l.id,
      accountCode: l.accountCode,
      // Canonical 2dp string. Storage scale is NUMERIC(14, 2) so toFixed(2)
      // never rounds in a meaningful way; it just normalises '100' -> '100.00'
      // for predictable consumer rendering and equality comparisons.
      amount: l.amount.toFixed(2),
    })),
  };
}
