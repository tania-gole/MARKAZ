import type { AccountCode } from './accounts';

export type PostingLineInput = {
  accountCode: AccountCode;
  /**
   * Signed Decimal as a string at the API boundary. Positive = debit,
   * negative = credit. String (not number — float drift; not Prisma.Decimal —
   * callers shouldn't need to import Prisma). Must have <= 2 decimal places;
   * sub-cent input is rejected with AmountScaleError to keep the in-app
   * balance check in lockstep with the NUMERIC(14, 2) storage scale.
   */
  amount: string;
};

export type PostingInput = {
  aggregateType: string;
  aggregateId: string;
  description: string;
  /**
   * The user who triggered this posting, or null for system-triggered ones
   * (scheduled jobs, retry workers). Required field; caller must explicitly
   * pass null rather than omit, so an audit trail is never accidentally
   * anonymous.
   */
  actorId: string | null;
  /**
   * Optional idempotency key. If provided, repeated posts with the same key
   * return the original posting (no duplicate). Choose stable keys for the
   * same logical event (e.g. `commission-${transactionId}`, not
   * `commission-${Date.now()}`).
   */
  idempotencyKey?: string;
  /** Defaults to AED at the DB level if omitted. */
  currency?: string;
  lines: readonly PostingLineInput[];
};

export type PostingResultLine = {
  id: string;
  accountCode: string;
  /** Stored value as string (e.g. "100.00"). */
  amount: string;
};

export type PostingResult = {
  postingId: string;
  lines: readonly PostingResultLine[];
};

export type Ledger = {
  post(input: PostingInput): Promise<PostingResult>;
};
