import type { VerifyEmiratesIdResult } from './types';

export type VerifyEmiratesIdInput = {
  plainEid: string;
  requestedBy: string;
};

/**
 * IdentityAdapter — verifies an Emirates ID against the provider of record
 * (UAE PASS, when wired; operations-driven manual review until then).
 *
 * SCOPE: this adapter does verification ONLY.
 *
 * The encryption seam is NOT in this adapter. The feature layer that calls
 * verifyEmiratesId already holds the plainEid (it passed it in). On a
 * { kind: 'verified' } result, the feature layer calls @markaz/auth's
 * hashEmiratesId(plainEid) to compute the User.emiratesIdHash column AND
 * encryptEmiratesId(plainEid) to compute User.emiratesIdEnc, then persists.
 *
 * Keeping the crypto in @markaz/auth means: one module owns the key, one
 * module owns the algorithm. This adapter never sees the encrypted bytes
 * and never needs to know they exist.
 */
export interface IdentityAdapter {
  verifyEmiratesId(input: VerifyEmiratesIdInput): Promise<VerifyEmiratesIdResult>;
}

/**
 * Fail-loud stub. Real UAE PASS / manual-review implementation wires in
 * Week 3 with MKZ-H-001 (seller registration).
 *
 * SAFETY PROPERTIES — any future implementation MUST preserve these:
 *
 *   1. NEVER silently succeed. A stub that returned { kind: 'verified' }
 *      would let a User get flagged identity-verified without any
 *      verification happening. The interface contract is: until a real
 *      verifier is wired, every call throws. No silent passes.
 *
 *   2. NEVER echo plainEid in the error message, the thrown error's own
 *      properties, console output, or any other observable surface. The
 *      whole point of the encrypted column shape on User is to keep
 *      Emirates IDs out of plaintext-stored places; an error message in a
 *      log file or stack trace would defeat that. The unit tests assert
 *      this contract.
 */
export function createFailLoudIdentityAdapter(): IdentityAdapter {
  return {
    async verifyEmiratesId(_input: VerifyEmiratesIdInput): Promise<VerifyEmiratesIdResult> {
      throw new Error(
        'IdentityAdapter is not wired. Real UAE PASS / manual review lands in ' +
          'Week 3 with MKZ-H-001. (Inputs intentionally not echoed; Emirates ID is PII.)',
      );
    },
  };
}
