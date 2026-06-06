import { describe, it, expect } from 'vitest';
import { validateMachine } from './engine';
import { listingMachine, LISTING_STATES } from './listing';
import { allOwnersSigned, type AllOwnersSignedContext } from './guards';
import { GuardContextError } from './errors';

describe('listingMachine', () => {
  it('passes validateMachine', () => {
    expect(() => validateMachine(listingMachine)).not.toThrow();
  });

  it('uses Draft as the initial state', () => {
    expect(listingMachine.initialState).toBe('Draft');
  });

  it('declares Live, Withdrawn, Rejected as terminal states', () => {
    expect([...listingMachine.terminalStates].sort()).toEqual(['Live', 'Rejected', 'Withdrawn']);
  });

  it('allows withdraw from every pre-live state', () => {
    const preLive = LISTING_STATES.filter(
      (s) => s !== 'Live' && s !== 'Withdrawn' && s !== 'Rejected',
    );
    const withdrawFromStates = listingMachine.transitions
      .filter((t) => t.action === 'withdraw')
      .map((t) => t.from)
      .sort();
    expect(withdrawFromStates).toEqual([...preLive].sort());
  });

  it('wires the allOwnersSigned guard onto completeSignatures', () => {
    const t = listingMachine.transitions.find((x) => x.action === 'completeSignatures');
    expect(t?.guard).toBe(allOwnersSigned);
  });
});

describe('allOwnersSigned guard', () => {
  it('returns true when every owner signed', () => {
    const ctx: AllOwnersSignedContext = {
      signedOwnerIds: ['a', 'b'],
      totalOwnerIds: ['a', 'b'],
    };
    expect(allOwnersSigned(ctx)).toBe(true);
  });

  it('returns false when some owners are missing', () => {
    const ctx: AllOwnersSignedContext = {
      signedOwnerIds: ['a'],
      totalOwnerIds: ['a', 'b'],
    };
    expect(allOwnersSigned(ctx)).toBe(false);
  });

  it('returns false when there are no owners at all', () => {
    const ctx: AllOwnersSignedContext = { signedOwnerIds: [], totalOwnerIds: [] };
    expect(allOwnersSigned(ctx)).toBe(false);
  });

  it('throws GuardContextError on unexpected shape', () => {
    expect(() => allOwnersSigned({ totally: 'wrong' })).toThrow(GuardContextError);
  });

  it('throws GuardContextError on missing fields', () => {
    expect(() => allOwnersSigned({ signedOwnerIds: ['a'] })).toThrow(GuardContextError);
  });

  it('throws GuardContextError on non-string array members', () => {
    expect(() => allOwnersSigned({ signedOwnerIds: [1, 2], totalOwnerIds: ['a'] })).toThrow(
      GuardContextError,
    );
  });
});
