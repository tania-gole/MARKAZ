/**
 * Emirates ID encryption seam.
 *
 * Real cryptography lands in Week 3 with MKZ-H-001 (seller registration).
 * Until then, these helpers throw on any call so that any code path which
 * attempts to populate User.emiratesIdEnc / User.emiratesIdHash fails loudly
 * rather than silently storing nothing — or, worse, plaintext.
 *
 * Week 3 will replace the bodies with:
 *  - encryptEmiratesId: AES-256-GCM using a key from a managed secret store,
 *    returning ciphertext bytes for emiratesIdEnc.
 *  - hashEmiratesId: peppered deterministic SHA-256 for emiratesIdHash
 *    uniqueness lookups (does not expose plaintext to the DB).
 */

const NOT_WIRED_MESSAGE =
  'Emirates ID encryption is not wired yet. Real crypto lands in Week 3 with MKZ-H-001. ' +
  'Do not call from production code paths.';

export async function encryptEmiratesId(
  _plain: string,
): Promise<{ emiratesIdEnc: Buffer; emiratesIdHash: string }> {
  throw new Error(NOT_WIRED_MESSAGE);
}

export function hashEmiratesId(_plain: string): string {
  throw new Error(NOT_WIRED_MESSAGE);
}
