/**
 * Engine-thrown errors. Distinct classes per failure mode so callers can
 * discriminate via `instanceof`.
 */

export class UnknownMachineError extends Error {
  constructor(public readonly aggregateType: string) {
    super(`No machine registered for aggregateType "${aggregateType}"`);
    this.name = 'UnknownMachineError';
  }
}

export class UnknownAggregateError extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly aggregateId: string,
  ) {
    super(`No ${aggregateType} found with id ${aggregateId}`);
    this.name = 'UnknownAggregateError';
  }
}

export class IllegalTransitionError extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly currentState: string,
    public readonly action: string,
  ) {
    super(
      `No transition defined for action "${action}" from state "${currentState}" on ${aggregateType}`,
    );
    this.name = 'IllegalTransitionError';
  }
}

export class GuardFailedError extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly action: string,
    public readonly currentState: string,
  ) {
    super(
      `Guard rejected action "${action}" from state "${currentState}" on ${aggregateType}`,
    );
    this.name = 'GuardFailedError';
  }
}

export class GuardContextError extends Error {
  constructor(
    public readonly action: string,
    public readonly expected: string,
  ) {
    super(`Guard for action "${action}" received unexpected context. Expected: ${expected}`);
    this.name = 'GuardContextError';
  }
}

export class ConcurrentModificationError extends Error {
  constructor(
    public readonly aggregateType: string,
    public readonly aggregateId: string,
    public readonly expectedFrom: string,
  ) {
    super(
      `Concurrent modification: ${aggregateType} ${aggregateId} status no longer matches "${expectedFrom}"`,
    );
    this.name = 'ConcurrentModificationError';
  }
}

export class InvalidMachineError extends Error {
  constructor(message: string) {
    super(`Invalid machine config: ${message}`);
    this.name = 'InvalidMachineError';
  }
}
