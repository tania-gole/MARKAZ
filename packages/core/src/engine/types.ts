import type { Prisma } from '@markaz/db';

/**
 * A guard is a pure function evaluated before a transition fires. Returns true
 * to permit, false to reject (which the engine surfaces as GuardFailedError).
 *
 * The context is `unknown` because guardContext is supplied by the caller at
 * transition() time and isn't type-linked to the action at the engine API
 * boundary. Each guard implementation MUST narrow the context defensively at
 * its first line (a small isXContext(ctx) predicate is the convention) and
 * throw GuardContextError on mismatch. Never operate on untyped input.
 */
export type Guard = (ctx: unknown) => boolean | Promise<boolean>;

/**
 * A single transition in a machine. The pair (from, action) must be unique
 * within a machine; validateMachine enforces this at registration time.
 */
export type Transition<TState extends string, TAction extends string> = {
  readonly from: TState;
  readonly to: TState;
  readonly action: TAction;
  readonly guard?: Guard;
};

/**
 * A workflow machine: pure data, no behaviour. The engine reads this and acts.
 * Adding a state, transition, or guard is editing this literal, never editing
 * the engine.
 */
export type Machine<TState extends string, TAction extends string> = {
  readonly aggregateType: string;
  readonly initialState: TState;
  readonly terminalStates: readonly TState[];
  readonly transitions: readonly Transition<TState, TAction>[];
};

/**
 * Per-aggregate persistence adapter. The seam between the generic engine and
 * the concrete Prisma model whose status column is being updated. Adding a new
 * machine means writing a new adapter and registering it; no engine changes.
 */
export type PersistenceAdapter<TState extends string> = {
  /** Read current state for pre-flight before the engine opens its tx. */
  readState(id: string): Promise<TState | null>;

  /**
   * Compare-and-swap status update inside the engine's transaction.
   * Implementation:
   *   UPDATE <table> SET status = $to WHERE id = $id AND status = $from
   * Returns true if exactly one row was updated; false if the row was missing
   * or its status no longer matched $from (concurrent change wins).
   */
  casUpdateState(
    tx: Prisma.TransactionClient,
    id: string,
    from: TState,
    to: TState,
  ): Promise<boolean>;
};

/**
 * Registry shape. Engine stores each registered machine + its adapter keyed by
 * aggregateType. State / action type parameters widen to `string` here because
 * the registry is heterogeneous; type narrowness lives in the per-machine
 * definitions and the per-adapter implementations.
 */
export type EngineRegistry = Record<
  string,
  {
    machine: Machine<string, string>;
    adapter: PersistenceAdapter<string>;
  }
>;

/**
 * Input to engine.transition(). String-typed at this boundary; type narrowness
 * is recovered inside guards via their own context predicates.
 */
export type TransitionInput = {
  aggregateType: string;
  aggregateId: string;
  action: string;
  /**
   * The user who initiated the transition, or null for system-triggered ones
   * (e.g. offer expiry sweep). Required field; caller must explicitly pass
   * null rather than omit, so an audit trail is never accidentally anonymous.
   */
  actorId: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
  guardContext?: unknown;
};

/**
 * Result of a successful transition.
 */
export type TransitionResult = {
  from: string;
  to: string;
  eventId: string;
};
