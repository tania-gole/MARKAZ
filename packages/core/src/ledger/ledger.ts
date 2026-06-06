import { db, Prisma } from '@markaz/db';
import type { Ledger, PostingInput, PostingResult } from './types';
import { isAccountCode } from './accounts';
import {
  AmountScaleError,
  InsufficientLinesError,
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
        // and our insert. Unique constraint catches it (P2002). Re-fetch and
        // return the winner so the return shape matches a fresh post.
        if (
          input.idempotencyKey !== undefined &&
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
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

function validate(input: PostingInput): void {
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

  // 3. Every line's amount has <= 2 decimal places. Runs BEFORE the balance
  //    check so the in-app sum runs at the same 2dp scale that gets stored.
  //    Otherwise +0.014 + +0.014 + -0.028 would balance in-app but round to
  //    0.01 + 0.01 + -0.03 = -0.01 on disk.
  for (const [index, line] of input.lines.entries()) {
    const [, frac = ''] = line.amount.split('.');
    if (frac.length > 2) {
      throw new AmountScaleError(line.accountCode, line.amount, index);
    }
  }

  // 4. Every line non-zero. Decimal check handles '0', '0.00', '+0', '-0'.
  for (const [index, line] of input.lines.entries()) {
    if (new Prisma.Decimal(line.amount).isZero()) {
      throw new ZeroAmountLineError(line.accountCode, index);
    }
  }

  // 5. SUM(amount) = 0. Decimal arithmetic is exact at the 2dp scale
  //    guaranteed by check #3.
  const sum = input.lines.reduce(
    (acc, line) => acc.plus(new Prisma.Decimal(line.amount)),
    new Prisma.Decimal(0),
  );
  if (!sum.isZero()) {
    throw new UnbalancedPostingError(sum.toString());
  }
}

// Use Prisma's inferred shape for posting+lines so the type lines up exactly
// with what db.posting.create / findUnique return when include: { lines: true }.
// Falls back to a structural superset so the test mock (which returns a plain
// object lacking some Prisma metadata fields) also satisfies it.
type PostingRow = Prisma.PostingGetPayload<{ include: { lines: true } }> | {
  id: string;
  lines: ReadonlyArray<{ id: string; accountCode: string; amount: unknown }>;
};

function toResult(posting: PostingRow): PostingResult {
  return {
    postingId: posting.id,
    lines: posting.lines.map((l) => ({
      id: l.id,
      accountCode: l.accountCode,
      // Prisma returns a Decimal object; the mock returns a string. Both
      // String-coerce to the right text representation.
      amount: String(l.amount),
    })),
  };
}
