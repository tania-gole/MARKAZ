// Pure unit tests for validate(). No mock, no DB, no createLedger().
// post() orchestration (atomic write, idempotency, race-catch) is covered
// by ledger.integration.test.ts against real Postgres.

import { describe, it, expect } from 'vitest';
import { validate } from './ledger';
import type { PostingInput, PostingLineInput } from './types';
import {
  AmountScaleError,
  InsufficientLinesError,
  InvalidAmountError,
  UnbalancedPostingError,
  UnknownAccountError,
  ZeroAmountLineError,
} from './errors';

function input(lines: PostingLineInput[]): PostingInput {
  return {
    aggregateType: 't',
    aggregateId: '1',
    description: 'x',
    actorId: null,
    lines,
  };
}

describe('validate() — line count', () => {
  it('accepts a balanced two-line posting', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '100.00' },
          { accountCode: 'commission_revenue', amount: '-100.00' },
        ]),
      ),
    ).not.toThrow();
  });

  it('accepts a balanced multi-line posting with mixed signs', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '40.00' },
          { accountCode: 'commission_receivable', amount: '60.00' },
          { accountCode: 'commission_revenue', amount: '-100.00' },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects 1 line with InsufficientLinesError', () => {
    expect(() =>
      validate(input([{ accountCode: 'commission_receivable', amount: '100.00' }])),
    ).toThrow(InsufficientLinesError);
  });

  it('rejects 0 lines with InsufficientLinesError', () => {
    expect(() => validate(input([]))).toThrow(InsufficientLinesError);
  });
});

describe('validate() — accountCode', () => {
  it('rejects an unknown accountCode with UnknownAccountError', () => {
    expect(() =>
      validate(
        input([
          // Cast required because the TS literal type would catch this; we want
          // to verify the runtime guard rejects too.
          { accountCode: 'cash' as 'commission_revenue', amount: '100' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ]),
      ),
    ).toThrow(UnknownAccountError);
  });
});

describe('validate() — amount format', () => {
  it('accepts integer amounts (no decimal point)', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '100' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ]),
      ),
    ).not.toThrow();
  });

  it('rejects "abc" with InvalidAmountError', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: 'abc' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ]),
      ),
    ).toThrow(InvalidAmountError);
  });

  it('rejects empty string with InvalidAmountError', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ]),
      ),
    ).toThrow(InvalidAmountError);
  });

  it('rejects sub-cent literal "0.014" with AmountScaleError', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '0.014' },
          { accountCode: 'commission_receivable', amount: '0.014' },
          { accountCode: 'commission_revenue', amount: '-0.028' },
        ]),
      ),
    ).toThrow(AmountScaleError);
  });

  it('rejects sub-cent scientific notation "15e-4" with AmountScaleError', () => {
    // 15e-4 = 0.0015 — four decimal places after parse. The string-split
    // approach would have missed this (no '.' in '15e-4'); decimalPlaces()
    // after Decimal parse catches it.
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '15e-4' },
          { accountCode: 'commission_revenue', amount: '-15e-4' },
        ]),
      ),
    ).toThrow(AmountScaleError);
  });
});

describe('validate() — zero amounts', () => {
  it('rejects "0" with ZeroAmountLineError', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '0' },
          { accountCode: 'commission_revenue', amount: '0' },
        ]),
      ),
    ).toThrow(ZeroAmountLineError);
  });

  it('rejects "0.00" as zero', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '0.00' },
          { accountCode: 'commission_revenue', amount: '-100' },
        ]),
      ),
    ).toThrow(ZeroAmountLineError);
  });
});

describe('validate() — balance', () => {
  it('rejects an unbalanced sum with UnbalancedPostingError', () => {
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '100.00' },
          { accountCode: 'commission_revenue', amount: '-99.00' },
        ]),
      ),
    ).toThrow(UnbalancedPostingError);
  });

  it('balances 0.10 + 0.20 against -0.30 without float drift', () => {
    // The float trap: 0.1 + 0.2 === 0.30000000000000004 in IEEE 754.
    // Decimal arithmetic must compute exact 0.30 here.
    expect(() =>
      validate(
        input([
          { accountCode: 'commission_receivable', amount: '0.10' },
          { accountCode: 'commission_receivable', amount: '0.20' },
          { accountCode: 'commission_revenue', amount: '-0.30' },
        ]),
      ),
    ).not.toThrow();
  });
});
