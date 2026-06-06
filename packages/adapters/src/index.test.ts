import { describe, it, expect } from 'vitest';
import { createAdapters } from './index';
import type { IdentityAdapter, ESignAdapter } from './index';

describe('createAdapters', () => {
  it('returns the fail-loud identity stub by default', async () => {
    const adapters = createAdapters();
    await expect(
      adapters.identity.verifyEmiratesId({ plainEid: 'x', requestedBy: 'u' }),
    ).rejects.toThrow(/not wired/i);
  });

  it('returns the manual esign impl by default', async () => {
    const adapters = createAdapters();
    const result = await adapters.esign.createFormASigningRequest({
      listingId: 'l',
      ownerPartyIds: ['p'],
      documentRef: 'r',
    });
    expect(result.kind).toBe('initiated');
  });

  it('uses an identity override when provided', async () => {
    const fakeIdentity: IdentityAdapter = {
      verifyEmiratesId: async () => ({ kind: 'verified', verifiedAt: new Date() }),
    };
    const adapters = createAdapters({ identity: fakeIdentity });
    const result = await adapters.identity.verifyEmiratesId({
      plainEid: 'x',
      requestedBy: 'u',
    });
    expect(result.kind).toBe('verified');
  });

  it('uses an esign override when provided', async () => {
    const fakeESign: ESignAdapter = {
      createFormASigningRequest: async () => ({ kind: 'failed', reason: 'fake' }),
      recordSignature: async () => ({ kind: 'rejected', reason: 'fake' }),
    };
    const adapters = createAdapters({ esign: fakeESign });
    const result = await adapters.esign.createFormASigningRequest({
      listingId: 'l',
      ownerPartyIds: ['p'],
      documentRef: 'r',
    });
    expect(result.kind).toBe('failed');
  });

  it('leaves non-overridden adapters at their defaults (identity override only)', async () => {
    const fakeIdentity: IdentityAdapter = {
      verifyEmiratesId: async () => ({ kind: 'verified', verifiedAt: new Date() }),
    };
    const adapters = createAdapters({ identity: fakeIdentity });
    // esign should still be the default manual impl
    const result = await adapters.esign.createFormASigningRequest({
      listingId: 'l',
      ownerPartyIds: ['p'],
      documentRef: 'r',
    });
    expect(result.kind).toBe('initiated');
  });
});
