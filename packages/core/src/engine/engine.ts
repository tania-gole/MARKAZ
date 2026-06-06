import { db, Prisma } from '@markaz/db';
import type {
  EngineRegistry,
  Machine,
  TransitionInput,
  TransitionResult,
} from './types';
import {
  ConcurrentModificationError,
  GuardFailedError,
  IllegalTransitionError,
  InvalidMachineError,
  UnknownAggregateError,
  UnknownMachineError,
} from './errors';

export type Engine = {
  transition(input: TransitionInput): Promise<TransitionResult>;
};

/**
 * Validate a machine config. Catches bad config at engine startup, not at the
 * first request. Throws InvalidMachineError on any of:
 *   - initialState not in the declared set
 *   - terminalState not in the declared set
 *   - duplicate (from, action) pair (would make transition lookup ambiguous)
 *   - transition originating from a terminal state (terminals are absorbing)
 */
export function validateMachine(machine: Machine<string, string>): void {
  // Derive the set of "real" states from transitions only — states that appear
  // as a from or to. initialState and terminalStates must be in this set;
  // otherwise they're orphans referencing nothing.
  const declared = new Set<string>();
  for (const t of machine.transitions) {
    declared.add(t.from);
    declared.add(t.to);
  }

  if (!declared.has(machine.initialState)) {
    throw new InvalidMachineError(
      `initialState "${machine.initialState}" is not referenced by any transition`,
    );
  }
  for (const s of machine.terminalStates) {
    if (!declared.has(s)) {
      throw new InvalidMachineError(`terminalState "${s}" is not referenced by any transition`);
    }
  }

  const terminalSet = new Set<string>(machine.terminalStates);
  const seen = new Set<string>();
  for (const t of machine.transitions) {
    if (terminalSet.has(t.from)) {
      throw new InvalidMachineError(
        `transition originates from terminal state "${t.from}" (action "${t.action}")`,
      );
    }
    const key = `${t.from}::${t.action}`;
    if (seen.has(key)) {
      throw new InvalidMachineError(
        `duplicate transition for (from="${t.from}", action="${t.action}")`,
      );
    }
    seen.add(key);
  }
}

/**
 * Create an engine over a registry of (machine, adapter) pairs. Validates all
 * machines at construction; throws InvalidMachineError if any is invalid.
 *
 * Returns an engine exposing exactly one mutating method: transition(). No
 * addMachine, no removeMachine, no event reader. Append-only events can't
 * leak through some other backdoor because there is no other door.
 */
export function createEngine(registry: EngineRegistry): Engine {
  for (const [aggregateType, entry] of Object.entries(registry)) {
    if (entry.machine.aggregateType !== aggregateType) {
      throw new InvalidMachineError(
        `registry key "${aggregateType}" does not match machine.aggregateType "${entry.machine.aggregateType}"`,
      );
    }
    validateMachine(entry.machine);
  }

  return {
    async transition(input: TransitionInput): Promise<TransitionResult> {
      // --- Pre-flight (outside the tx) ---
      const config = registry[input.aggregateType];
      if (!config) throw new UnknownMachineError(input.aggregateType);

      const currentState = await config.adapter.readState(input.aggregateId);
      if (currentState === null) {
        throw new UnknownAggregateError(input.aggregateType, input.aggregateId);
      }

      const t = config.machine.transitions.find(
        (x) => x.from === currentState && x.action === input.action,
      );
      if (!t) {
        throw new IllegalTransitionError(input.aggregateType, currentState, input.action);
      }

      if (t.guard) {
        // Race window to know about: this guard evaluates OUTSIDE the tx. Its
        // input (guardContext) reflects whatever the caller fetched moments
        // before. CAS on status (below) catches concurrent STATUS changes; it
        // does NOT catch concurrent changes to the guard's source data. If a
        // future guard needs strong consistency, extend Guard to optionally
        // accept tx and run reads inside the transaction.
        const passed = await t.guard(input.guardContext);
        if (!passed) {
          throw new GuardFailedError(input.aggregateType, input.action, currentState);
        }
      }

      // --- Atomic write (inside one tx) ---
      // Both writes in one db.$transaction. Prisma rolls back on any throw.
      // No path through the engine leaves status changed without an event, or
      // an event written without the matching status change.
      let eventId!: string;
      await db.$transaction(async (tx) => {
        const updated = await config.adapter.casUpdateState(
          tx,
          input.aggregateId,
          currentState,
          t.to,
        );
        if (!updated) {
          // Throwing here rolls back; no event row is created.
          throw new ConcurrentModificationError(
            input.aggregateType,
            input.aggregateId,
            currentState,
          );
        }
        const event = await tx.event.create({
          data: {
            aggregateType: input.aggregateType,
            aggregateId: input.aggregateId,
            fromState: currentState,
            toState: t.to,
            actorId: input.actorId,
            reason: input.reason ?? null,
            // Prisma.DbNull writes SQL NULL; bare `null` would write the JSON
            // literal `null`, which is a different value (matters for queries
            // like `WHERE metadata IS NULL`).
            metadata:
              input.metadata !== undefined
                ? (input.metadata as Prisma.InputJsonValue)
                : Prisma.DbNull,
          },
        });
        eventId = event.id;
      });

      return { from: currentState, to: t.to, eventId };
    },
  };
}
