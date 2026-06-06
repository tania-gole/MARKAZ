/**
 * Ledger-thrown errors. Distinct classes per failure mode so callers can
 * discriminate via `instanceof`.
 */

export class InsufficientLinesError extends Error {
  constructor(public readonly lineCount: number) {
    super(`Posting requires at least 2 lines; received ${lineCount}`);
    this.name = 'InsufficientLinesError';
  }
}

export class ZeroAmountLineError extends Error {
  constructor(
    public readonly accountCode: string,
    public readonly index: number,
  ) {
    super(
      `Line ${index} (account "${accountCode}") has zero amount; zero-amount lines are meaningless in double-entry`,
    );
    this.name = 'ZeroAmountLineError';
  }
}

export class UnknownAccountError extends Error {
  constructor(public readonly accountCode: string) {
    super(`Unknown account code "${accountCode}"`);
    this.name = 'UnknownAccountError';
  }
}

export class UnbalancedPostingError extends Error {
  constructor(public readonly sum: string) {
    super(`Posting does not balance: sum of line amounts = ${sum} (must be 0)`);
    this.name = 'UnbalancedPostingError';
  }
}

/**
 * Storage column is NUMERIC(14, 2), which rounds on store. If we accepted
 * sub-cent input and ran the balance check at full precision, a posting could
 * pass the in-app check and then store as unbalanced (e.g. +0.014 + 0.014 +
 * -0.028 in app sums to 0; stored as 0.01 + 0.01 + -0.03 = -0.01). Rejecting
 * sub-cent input at the boundary keeps the check in lockstep with storage.
 *
 * Detected via Decimal.decimalPlaces() > 2 after parsing — so scientific
 * notation ('15e-4' = 0.0015 = 4dp) is caught too, not just literal '0.014'.
 */
export class AmountScaleError extends Error {
  constructor(
    public readonly accountCode: string,
    public readonly amount: string,
    public readonly index: number,
  ) {
    super(
      `Line ${index} (account "${accountCode}") amount "${amount}" has more than 2 decimal places; storage scale is NUMERIC(14, 2)`,
    );
    this.name = 'AmountScaleError';
  }
}

/**
 * Amount string couldn't be parsed as a number by Prisma.Decimal. Distinct
 * from AmountScaleError so callers can discriminate "bad input format" from
 * "valid number, just too precise."
 */
export class InvalidAmountError extends Error {
  constructor(
    public readonly accountCode: string,
    public readonly amount: string,
    public readonly index: number,
  ) {
    super(`Line ${index} (account "${accountCode}") amount "${amount}" is not a valid number`);
    this.name = 'InvalidAmountError';
  }
}
