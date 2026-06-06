import { describe, it, expect, vi, beforeEach } from 'vitest';

// Partial mock: keep real Prisma (for Decimal arithmetic etc.), replace `db`
// with controlled fakes. dbMock is hoisted via vi.hoisted because vi.mock's
// factory runs ABOVE imports — a plain const declaration would be a TDZ ref.
const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    posting: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@markaz/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@markaz/db')>();
  return { ...actual, db: dbMock };
});

import { createLedger } from './ledger';
import {
  AmountScaleError,
  InsufficientLinesError,
  UnbalancedPostingError,
  UnknownAccountError,
  ZeroAmountLineError,
} from './errors';

const ledger = createLedger();

beforeEach(() => {
  vi.clearAllMocks();
  // Default: create returns a synthetic posting with the supplied lines projected
  dbMock.posting.create.mockImplementation(
    async (args: { data: { lines: { create: { accountCode: string; amount: string }[] } } }) => ({
      id: 'posting-stub',
      lines: args.data.lines.create.map((l, i) => ({
        id: `line-${i + 1}`,
        accountCode: l.accountCode,
        amount: l.amount,
      })),
    }),
  );
  dbMock.posting.findUnique.mockResolvedValue(null);
});

describe('post() — validation', () => {
  it('accepts a balanced two-line posting', async () => {
    const result = await ledger.post({
      aggregateType: 'transaction',
      aggregateId: 'tx-1',
      description: '1% commission',
      actorId: null,
      lines: [
        { accountCode: 'commission_receivable', amount: '100.00' },
        { accountCode: 'commission_revenue', amount: '-100.00' },
      ],
    });
    expect(result.postingId).toBeDefined();
    expect(result.lines).toHaveLength(2);
  });

  it('accepts a balanced multi-line posting with mixed signs', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'split',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '40.00' },
          { accountCode: 'commission_receivable', amount: '60.00' },
          { accountCode: 'commission_revenue', amount: '-100.00' },
        ],
      }),
    ).resolves.toBeDefined();
  });

  it('rejects fewer than 2 lines with InsufficientLinesError', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'x',
        actorId: null,
        lines: [{ accountCode: 'commission_receivable', amount: '100.00' }],
      }),
    ).rejects.toBeInstanceOf(InsufficientLinesError);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('rejects zero lines with InsufficientLinesError', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'x',
        actorId: null,
        lines: [],
      }),
    ).rejects.toBeInstanceOf(InsufficientLinesError);
  });

  it('rejects a zero-amount line with ZeroAmountLineError', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'x',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '0' },
          { accountCode: 'commission_revenue', amount: '0' },
        ],
      }),
    ).rejects.toBeInstanceOf(ZeroAmountLineError);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('rejects an unknown account code with UnknownAccountError', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'x',
        actorId: null,
        lines: [
          // Cast required because the TS literal type would catch this; we want
          // to verify the runtime guard rejects too.
          { accountCode: 'cash' as 'commission_revenue', amount: '100.00' },
          { accountCode: 'commission_revenue', amount: '-100.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(UnknownAccountError);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('rejects an unbalanced posting with UnbalancedPostingError', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'x',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '100.00' },
          { accountCode: 'commission_revenue', amount: '-99.00' },
        ],
      }),
    ).rejects.toBeInstanceOf(UnbalancedPostingError);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('rejects sub-cent precision with AmountScaleError (storage scale is 2dp)', async () => {
    // Worked example: +0.014 + +0.014 + -0.028 sums to 0 in full precision,
    // but rounds to 0.01 + 0.01 + -0.03 = -0.01 on store. Reject the input.
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'sub-cent',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '0.014' },
          { accountCode: 'commission_receivable', amount: '0.014' },
          { accountCode: 'commission_revenue', amount: '-0.028' },
        ],
      }),
    ).rejects.toBeInstanceOf(AmountScaleError);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('accepts integer amounts (no decimal point)', async () => {
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'integers',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '100' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ],
      }),
    ).resolves.toBeDefined();
  });
});

describe('post() — Decimal arithmetic', () => {
  it('balances 0.10 + 0.20 against -0.30 without float drift', async () => {
    // The float trap: 0.1 + 0.2 === 0.30000000000000004 in IEEE 754.
    // Decimal arithmetic must compute exact 0.30 here.
    await expect(
      ledger.post({
        aggregateType: 't',
        aggregateId: '1',
        description: 'decimal trap',
        actorId: null,
        lines: [
          { accountCode: 'commission_receivable', amount: '0.10' },
          { accountCode: 'commission_receivable', amount: '0.20' },
          { accountCode: 'commission_revenue', amount: '-0.30' },
        ],
      }),
    ).resolves.toBeDefined();
  });
});

describe('post() — idempotency', () => {
  it('returns the existing posting on pre-check hit (no create call)', async () => {
    dbMock.posting.findUnique.mockResolvedValueOnce({
      id: 'existing-posting',
      lines: [
        { id: 'l1', accountCode: 'commission_receivable', amount: '100.00' },
        { id: 'l2', accountCode: 'commission_revenue', amount: '-100.00' },
      ],
    });
    const result = await ledger.post({
      aggregateType: 't',
      aggregateId: '1',
      description: 'retry',
      actorId: null,
      idempotencyKey: 'key-1',
      lines: [
        { accountCode: 'commission_receivable', amount: '100.00' },
        { accountCode: 'commission_revenue', amount: '-100.00' },
      ],
    });
    expect(result.postingId).toBe('existing-posting');
    expect(result.lines).toHaveLength(2);
    expect(dbMock.posting.create).not.toHaveBeenCalled();
  });

  it('idempotent return shape matches a fresh post (lines included)', async () => {
    dbMock.posting.findUnique.mockResolvedValueOnce({
      id: 'existing-posting',
      lines: [
        { id: 'l1', accountCode: 'commission_receivable', amount: '50.00' },
        { id: 'l2', accountCode: 'commission_revenue', amount: '-50.00' },
      ],
    });
    const result = await ledger.post({
      aggregateType: 't',
      aggregateId: '1',
      description: 'retry',
      actorId: null,
      idempotencyKey: 'k',
      lines: [
        { accountCode: 'commission_receivable', amount: '50.00' },
        { accountCode: 'commission_revenue', amount: '-50.00' },
      ],
    });
    // Same shape as a fresh post: { postingId, lines: [{id, accountCode, amount}] }
    expect(result.lines[0]).toMatchObject({
      id: expect.any(String),
      accountCode: expect.any(String),
      amount: expect.any(String),
    });
  });
});
