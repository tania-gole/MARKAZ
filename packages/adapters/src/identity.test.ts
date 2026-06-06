import { describe, it, expect } from 'vitest';
import { createFailLoudIdentityAdapter } from './identity';

describe('createFailLoudIdentityAdapter', () => {
  const adapter = createFailLoudIdentityAdapter();
  // A sample Emirates ID format (deliberately not a real one). The PII-safety
  // tests check that no portion of THIS string surfaces in the error.
  const sampleEid = '784-1990-1234567-1';

  it('throws on verifyEmiratesId (fail-loud, no silent success)', async () => {
    await expect(
      adapter.verifyEmiratesId({ plainEid: sampleEid, requestedBy: 'user-1' }),
    ).rejects.toThrow(/not wired/i);
  });

  it('thrown error does not echo the full plainEid on any observable surface', async () => {
    let caught: unknown;
    try {
      await adapter.verifyEmiratesId({ plainEid: sampleEid, requestedBy: 'user-1' });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    const err = caught as Error;

    expect(err.message).not.toContain(sampleEid);
    expect(String(err)).not.toContain(sampleEid);
    expect(err.stack ?? '').not.toContain(sampleEid);
    // Serialise own-properties (Error has non-enumerable message/stack normally).
    expect(JSON.stringify(err, Object.getOwnPropertyNames(err))).not.toContain(sampleEid);
  });

  it('thrown error does not echo any meaningful segment of the EID either', async () => {
    let caught: unknown;
    try {
      await adapter.verifyEmiratesId({ plainEid: sampleEid, requestedBy: 'user-1' });
    } catch (err) {
      caught = err;
    }
    const err = caught as Error;
    // Any segment of length >= 3 between dashes should be absent — guards
    // against a "leak just the year" or "leak just the serial" regression.
    for (const segment of sampleEid.split('-')) {
      if (segment.length >= 3) {
        expect(err.message).not.toContain(segment);
        expect(err.stack ?? '').not.toContain(segment);
      }
    }
  });
});
