import { describe, it, expect } from 'vitest';
import { ACCOUNT_CODES, isAccountCode } from './accounts';

describe('ACCOUNT_CODES', () => {
  it('exposes the minimal pilot set (just commission accounts)', () => {
    expect([...ACCOUNT_CODES].sort()).toEqual([
      'commission_receivable',
      'commission_revenue',
    ]);
  });
});

describe('isAccountCode', () => {
  it('returns true for every code in the registry', () => {
    for (const code of ACCOUNT_CODES) {
      expect(isAccountCode(code)).toBe(true);
    }
  });

  it('returns false for unknown codes', () => {
    expect(isAccountCode('')).toBe(false);
    expect(isAccountCode('unknown')).toBe(false);
    expect(isAccountCode('cash')).toBe(false);
    expect(isAccountCode('commission_collected')).toBe(false);
  });
});
