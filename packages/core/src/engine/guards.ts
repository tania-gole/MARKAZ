import type { Guard } from './types';
import { GuardContextError } from './errors';

export type AllOwnersSignedContext = {
  readonly signedOwnerIds: readonly string[];
  readonly totalOwnerIds: readonly string[];
};

function isAllOwnersSignedContext(x: unknown): x is AllOwnersSignedContext {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  const signed = c['signedOwnerIds'];
  const total = c['totalOwnerIds'];
  if (!Array.isArray(signed) || !Array.isArray(total)) return false;
  return (
    signed.every((v: unknown) => typeof v === 'string') &&
    total.every((v: unknown) => typeof v === 'string')
  );
}

/**
 * Guard for the listing machine's PendingSignature -> PendingPermit transition.
 * Permits the advance only when every owner has a corresponding signature.
 * Pure: caller assembles the two arrays and passes them as guardContext.
 */
export const allOwnersSigned: Guard = (ctx) => {
  if (!isAllOwnersSignedContext(ctx)) {
    throw new GuardContextError(
      'completeSignatures',
      '{ signedOwnerIds: string[]; totalOwnerIds: string[] }',
    );
  }
  if (ctx.totalOwnerIds.length === 0) return false;
  return ctx.totalOwnerIds.every((id) => ctx.signedOwnerIds.includes(id));
};
