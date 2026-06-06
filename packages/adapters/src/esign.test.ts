import { describe, it, expect } from 'vitest';
import { createManualESignAdapter } from './esign';

describe('createManualESignAdapter — createFormASigningRequest', () => {
  const adapter = createManualESignAdapter();

  it('returns kind=initiated with a manual-prefixed id when owners are provided', async () => {
    const result = await adapter.createFormASigningRequest({
      listingId: 'l-1',
      ownerPartyIds: ['p-1', 'p-2'],
      documentRef: 'storage/form-a.pdf',
    });
    expect(result.kind).toBe('initiated');
    if (result.kind === 'initiated') {
      expect(result.signingRequestId).toMatch(/^manual-/);
    }
  });

  it('returns kind=failed with reason when ownerPartyIds is empty', async () => {
    const result = await adapter.createFormASigningRequest({
      listingId: 'l-1',
      ownerPartyIds: [],
      documentRef: 'storage/form-a.pdf',
    });
    expect(result.kind).toBe('failed');
    if (result.kind === 'failed') {
      expect(result.reason).toBeTruthy();
    }
  });

  it('generates a unique signing request id per call', async () => {
    const input = {
      listingId: 'l-1',
      ownerPartyIds: ['p-1'],
      documentRef: 'storage/form-a.pdf',
    };
    const a = await adapter.createFormASigningRequest(input);
    const b = await adapter.createFormASigningRequest(input);
    if (a.kind === 'initiated' && b.kind === 'initiated') {
      expect(a.signingRequestId).not.toBe(b.signingRequestId);
    }
  });
});

describe('createManualESignAdapter — recordSignature', () => {
  const adapter = createManualESignAdapter();

  it('returns kind=recorded carrying the input signedAt', async () => {
    const signedAt = new Date('2026-06-10T12:34:56Z');
    const result = await adapter.recordSignature({
      listingId: 'l-1',
      signingRequestId: 'manual-abc',
      ownerPartyId: 'p-1',
      signedAt,
    });
    expect(result.kind).toBe('recorded');
    if (result.kind === 'recorded') {
      expect(result.signedAt).toEqual(signedAt);
    }
  });
});
