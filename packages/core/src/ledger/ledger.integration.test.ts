import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { db, Prisma } from '@markaz/db';
import { createLedger } from './index';
import { UnbalancedPostingError } from './errors';

// Sum stored line amounts with Decimal arithmetic, not Number() — using
// JS floats here would trip the very float-drift bug the ledger exists to
// avoid (0.1 + 0.2 - 0.3 === -5.55e-17 in IEEE 754).
function sumLines(lines: ReadonlyArray<{ amount: unknown }>): Prisma.Decimal {
  return lines.reduce(
    (s, l) => s.plus(new Prisma.Decimal(String(l.amount))),
    new Prisma.Decimal(0),
  );
}

const ledger = createLedger();

beforeEach(async () => {
  // Clean state per test. PostingLine first (FK Restrict on Posting).
  await db.postingLine.deleteMany({});
  await db.posting.deleteMany({});
});

afterAll(async () => {
  await db.postingLine.deleteMany({});
  await db.posting.deleteMany({});
  await db.$disconnect();
});

describe('post() — atomic multi-line insert', () => {
  it('writes Posting + all lines in one transaction', async () => {
    const result = await ledger.post({
      aggregateType: 'transaction',
      aggregateId: 'tx-1',
      description: '1% commission on listing X',
      actorId: 'user-1',
      lines: [
        { accountCode: 'commission_receivable', amount: '10000.00' },
        { accountCode: 'commission_revenue', amount: '-10000.00' },
      ],
    });

    const stored = await db.posting.findUnique({
      where: { id: result.postingId },
      include: { lines: true },
    });
    expect(stored).not.toBeNull();
    expect(stored!.aggregateType).toBe('transaction');
    expect(stored!.aggregateId).toBe('tx-1');
    expect(stored!.description).toBe('1% commission on listing X');
    expect(stored!.actorId).toBe('user-1');
    expect(stored!.currency).toBe('AED');
    expect(stored!.lines).toHaveLength(2);

    expect(sumLines(stored!.lines).isZero()).toBe(true);
  });

  it('writes NOTHING when validation rejects (unbalanced)', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'unbalanced',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '100.00' },
          { accountCode: 'commission_revenue', amount: '-99.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedPostingError);

    expect(await db.posting.count()).toBe(0);
    expect(await db.postingLine.count()).toBe(0);
  });

  it('returns canonical 2dp amount strings regardless of input format', async () => {
    const result = await ledger.post({
      aggregateType: 't',
      aggregateId: '1',
      description: 'canonical-2dp',
      actorId: null,
      lines: [
        { accountCode: 'commission_receivable', amount: '100' }, // integer input
        { accountCode: 'commission_revenue', amount: '-100.00' }, // 2dp input
      ],
    });
    for (const line of result.lines) {
      // Always "<digits>.<exactly two digits>" — toFixed(2) normalises.
      expect(line.amount).toMatch(/^-?\d+\.\d{2}$/);
    }
  });

  it('exact 2dp arithmetic: 0.10 + 0.20 + -0.30 balances and stores cleanly', async () => {
    const result = await ledger.post({
      aggregateType: 't',
      aggregateId: '1',
      description: 'small decimals',
      actorId: null,
      lines: [
        { accountCode: 'commission_receivable', amount: '0.10' },
        { accountCode: 'commission_receivable', amount: '0.20' },
        { accountCode: 'commission_revenue', amount: '-0.30' },
      ],
    });

    const stored = await db.posting.findUnique({
      where: { id: result.postingId },
      include: { lines: true },
    });
    expect(sumLines(stored!.lines).isZero()).toBe(true);
  });
});

describe('post() — idempotency', () => {
  it('returns the same posting on retry with the same key', async () => {
    const input = {
      aggregateType: 't',
      aggregateId: '1',
      description: 'retry',
      actorId: null,
      idempotencyKey: 'unique-key-1',
      lines: [
        { accountCode: 'commission_receivable' as const, amount: '100.00' },
        { accountCode: 'commission_revenue' as const, amount: '-100.00' },
      ],
    };

    const first = await ledger.post(input);
    const second = await ledger.post(input);

    expect(second.postingId).toBe(first.postingId);
    expect(await db.posting.count({ where: { idempotencyKey: 'unique-key-1' } })).toBe(1);
  });

  it('handles concurrent posts with the same key (one wins, both return its id)', async () => {
    const input = {
      aggregateType: 't',
      aggregateId: '1',
      description: 'race',
      actorId: null,
      idempotencyKey: 'race-key',
      lines: [
        { accountCode: 'commission_receivable' as const, amount: '50.00' },
        { accountCode: 'commission_revenue' as const, amount: '-50.00' },
      ],
    };

    const [a, b] = await Promise.all([ledger.post(input), ledger.post(input)]);
    expect(a.postingId).toBe(b.postingId);
    expect(await db.posting.count({ where: { idempotencyKey: 'race-key' } })).toBe(1);
  });

  it('idempotent return shape matches a fresh post (lines populated)', async () => {
    const input = {
      aggregateType: 't',
      aggregateId: '1',
      description: 'shape',
      actorId: null,
      idempotencyKey: 'shape-key',
      lines: [
        { accountCode: 'commission_receivable' as const, amount: '5.00' },
        { accountCode: 'commission_revenue' as const, amount: '-5.00' },
      ],
    };

    const fresh = await ledger.post(input);
    const retry = await ledger.post(input);
    expect(retry.lines).toHaveLength(fresh.lines.length);
    expect(retry.lines[0]?.accountCode).toBe(fresh.lines[0]?.accountCode);
  });
});
