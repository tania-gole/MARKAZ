import { randomUUID } from 'node:crypto';
import type { CreateFormARequestResult, RecordSignatureResult } from './types';

export type CreateFormARequestInput = {
  listingId: string;
  ownerPartyIds: readonly string[];
  documentRef: string;
};

export type RecordSignatureInput = {
  listingId: string;
  signingRequestId: string;
  ownerPartyId: string;
  signedAt: Date;
};

/**
 * ESignAdapter — Form A signing flow.
 *
 * createFormASigningRequest: initiate a signing session.
 *   - Manual: returns a generated tracking id. Operations sends Form A
 *     externally (email + signed PDF return) and refers to that id.
 *   - Real (future): calls the provider's API (DocuSign / Adobe Sign /
 *     similar) and returns the provider's session id. Same shape.
 *
 * recordSignature: persist a structured "owner X signed at time T" event.
 *   - Manual: operations panel calls this directly when the operator
 *     confirms a signature.
 *   - Real (future): a provider-specific webhook handler validates the
 *     webhook signature, extracts the structured fields from the payload,
 *     then calls recordSignature with the same shape. Webhook validation is
 *     route-handler concern (provider-specific signing secret), NOT this
 *     adapter's. Same shape on the recordSignature call either way.
 *
 * The feature layer persists signatures into our own DB (a Document of
 * type='FormASignature' is the expected pattern) and invokes
 * engine.transition('completeSignatures', ...) once the allOwnersSigned
 * guard is satisfied. The adapter just confirms / parses.
 */
export interface ESignAdapter {
  createFormASigningRequest(
    input: CreateFormARequestInput,
  ): Promise<CreateFormARequestResult>;
  recordSignature(input: RecordSignatureInput): Promise<RecordSignatureResult>;
}

/**
 * Manual-recorded implementation. No external calls. Generates tracking ids
 * for createFormASigningRequest; passes structured signature events through
 * for recordSignature.
 */
export function createManualESignAdapter(): ESignAdapter {
  return {
    async createFormASigningRequest(
      input: CreateFormARequestInput,
    ): Promise<CreateFormARequestResult> {
      if (input.ownerPartyIds.length === 0) {
        return { kind: 'failed', reason: 'No owners to sign' };
      }
      return { kind: 'initiated', signingRequestId: `manual-${randomUUID()}` };
    },
    async recordSignature(input: RecordSignatureInput): Promise<RecordSignatureResult> {
      // Manual impl accepts every well-formed signature event. The feature
      // layer is responsible for guarding against (e.g.) the same owner
      // recording twice; that's a DB-level uniqueness concern, not the
      // adapter's. A real provider would have its own rejection paths
      // (signature failed verification, etc.) and would return 'rejected'.
      return { kind: 'recorded', signedAt: input.signedAt };
    },
  };
}
