import { createFailLoudIdentityAdapter } from './identity';
import type { IdentityAdapter, VerifyEmiratesIdInput } from './identity';
import { createManualESignAdapter } from './esign';
import type {
  ESignAdapter,
  CreateFormARequestInput,
  RecordSignatureInput,
} from './esign';

export type {
  VerifyEmiratesIdResult,
  CreateFormARequestResult,
  RecordSignatureResult,
} from './types';

export type { IdentityAdapter, VerifyEmiratesIdInput };
export { createFailLoudIdentityAdapter };

export type { ESignAdapter, CreateFormARequestInput, RecordSignatureInput };
export { createManualESignAdapter };

export type Adapters = {
  identity: IdentityAdapter;
  esign: ESignAdapter;
};

/**
 * Wire the adapter set. Defaults: fail-loud stub for identity (real UAE PASS
 * / manual review lands in Week 3 with MKZ-H-001), manual-recorded for esign.
 *
 * Tests pass per-key overrides — any object satisfying the interface works.
 * Apps construct adapters once at startup and pass the Adapters object into
 * feature code; feature code depends on the interfaces, never on the concrete
 * implementation. When real impls arrive, add createRealIdentityAdapter() /
 * createRealESignAdapter() and choose via env-driven app startup config.
 */
export function createAdapters(overrides: Partial<Adapters> = {}): Adapters {
  return {
    identity: overrides.identity ?? createFailLoudIdentityAdapter(),
    esign: overrides.esign ?? createManualESignAdapter(),
  };
}
