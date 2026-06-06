// Result type unions for the adapter interfaces. Discriminated on `kind` so
// call sites can switch exhaustively (TypeScript's exhaustiveness check + our
// noFallthroughCasesInSwitch flag make missed branches a compile error).
//
// Expected business failures ('not_verified', 'failed', 'rejected', etc.) are
// VALUES, not exceptions. Exceptions are reserved for two things:
//   1. Stub implementations announcing they're not wired (fail-loud).
//   2. Genuine infrastructure faults (DB down, network unreachable, malformed
//      provider response).

export type VerifyEmiratesIdResult =
  | { kind: 'verified'; verifiedAt: Date }
  | { kind: 'not_verified'; reason: string }
  | { kind: 'requires_manual_review'; reason: string };

export type CreateFormARequestResult =
  | { kind: 'initiated'; signingRequestId: string }
  | { kind: 'failed'; reason: string };

export type RecordSignatureResult =
  | { kind: 'recorded'; signedAt: Date }
  | { kind: 'rejected'; reason: string };
