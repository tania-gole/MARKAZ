import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @markaz/db so unit tests don't touch a real DB. The mocked $transaction
// immediately invokes its callback with a tx object that records event.create
// calls (so tests can assert on them).
const eventCreateCalls: unknown[] = [];

vi.mock('@markaz/db', () => ({
  db: {
    $transaction: async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        event: {
          create: async (args: { data: unknown }) => {
            eventCreateCalls.push(args.data);
            return { id: `event-${eventCreateCalls.length}` };
          },
        },
      });
    },
  },
  // Prisma re-exported from @markaz/db (the single architectural seam to the ORM).
  // Only Prisma.DbNull is used at runtime by engine.ts; the sentinel shape here
  // matches what engine.ts compares against (it just passes it to tx.event.create).
  Prisma: { DbNull: { __DbNull: true } },
}));

import { createEngine, validateMachine } from './engine';
import type { Machine, PersistenceAdapter } from './types';
import {
  ConcurrentModificationError,
  GuardFailedError,
  IllegalTransitionError,
  InvalidMachineError,
  UnknownAggregateError,
  UnknownMachineError,
} from './errors';

beforeEach(() => {
  eventCreateCalls.length = 0;
});

function testMachine(): Machine<string, string> {
  return {
    aggregateType: 'test',
    initialState: 'A',
    terminalStates: ['C'],
    transitions: [
      { from: 'A', to: 'B', action: 'go' },
      {
        from: 'B',
        to: 'C',
        action: 'finish',
        guard: (ctx) => {
          const c = ctx as { ok?: boolean } | undefined;
          return Boolean(c?.ok);
        },
      },
    ],
  };
}

function buildEngine(adapter: Partial<PersistenceAdapter<string>> = {}) {
  const full: PersistenceAdapter<string> = {
    readState: async () => 'A',
    casUpdateState: async () => true,
    ...adapter,
  };
  return createEngine({ test: { machine: testMachine(), adapter: full } });
}

describe('validateMachine', () => {
  it('accepts a well-formed machine', () => {
    expect(() => validateMachine(testMachine())).not.toThrow();
  });

  it('rejects duplicate (from, action) pairs', () => {
    const m: Machine<string, string> = {
      aggregateType: 'x',
      initialState: 'A',
      terminalStates: ['B'],
      transitions: [
        { from: 'A', to: 'B', action: 'go' },
        { from: 'A', to: 'B', action: 'go' },
      ],
    };
    expect(() => validateMachine(m)).toThrow(InvalidMachineError);
  });

  it('rejects a transition originating from a terminal state', () => {
    const m: Machine<string, string> = {
      aggregateType: 'x',
      initialState: 'A',
      terminalStates: ['C'],
      transitions: [
        { from: 'A', to: 'C', action: 'finish' },
        { from: 'C', to: 'A', action: 'reopen' },
      ],
    };
    expect(() => validateMachine(m)).toThrow(InvalidMachineError);
  });

  it('rejects when initialState is unreferenced', () => {
    const m: Machine<string, string> = {
      aggregateType: 'x',
      initialState: 'Z',
      terminalStates: ['B'],
      transitions: [{ from: 'A', to: 'B', action: 'go' }],
    };
    expect(() => validateMachine(m)).toThrow(InvalidMachineError);
  });
});

describe('createEngine', () => {
  it('throws when registry key does not match machine.aggregateType', () => {
    const m = testMachine();
    expect(() =>
      createEngine({
        notTest: { machine: m, adapter: { readState: async () => 'A', casUpdateState: async () => true } },
      }),
    ).toThrow(InvalidMachineError);
  });
});

describe('engine.transition', () => {
  it('throws UnknownMachineError for an unregistered aggregateType', async () => {
    const engine = buildEngine();
    await expect(
      engine.transition({
        aggregateType: 'unknown',
        aggregateId: '1',
        action: 'go',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(UnknownMachineError);
  });

  it('throws UnknownAggregateError when readState returns null', async () => {
    const engine = buildEngine({ readState: async () => null });
    await expect(
      engine.transition({
        aggregateType: 'test',
        aggregateId: '1',
        action: 'go',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(UnknownAggregateError);
  });

  it('throws IllegalTransitionError when no transition matches (action, from)', async () => {
    const engine = buildEngine({ readState: async () => 'A' });
    await expect(
      engine.transition({
        aggregateType: 'test',
        aggregateId: '1',
        action: 'finish',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
  });

  it('throws GuardFailedError when the guard returns false', async () => {
    const engine = buildEngine({ readState: async () => 'B' });
    await expect(
      engine.transition({
        aggregateType: 'test',
        aggregateId: '1',
        action: 'finish',
        actorId: null,
        guardContext: { ok: false },
      }),
    ).rejects.toBeInstanceOf(GuardFailedError);
  });

  it('completes when guard passes and writes the event', async () => {
    const engine = buildEngine({ readState: async () => 'B' });
    const result = await engine.transition({
      aggregateType: 'test',
      aggregateId: 'abc',
      action: 'finish',
      actorId: 'user-1',
      reason: 'all good',
      guardContext: { ok: true },
    });
    expect(result.from).toBe('B');
    expect(result.to).toBe('C');
    expect(result.eventId).toMatch(/^event-/);
    expect(eventCreateCalls).toHaveLength(1);
    expect(eventCreateCalls[0]).toMatchObject({
      aggregateType: 'test',
      aggregateId: 'abc',
      fromState: 'B',
      toState: 'C',
      actorId: 'user-1',
      reason: 'all good',
    });
  });

  it('throws ConcurrentModificationError when CAS reports no rows updated', async () => {
    const engine = buildEngine({ casUpdateState: async () => false });
    await expect(
      engine.transition({
        aggregateType: 'test',
        aggregateId: '1',
        action: 'go',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(ConcurrentModificationError);
    expect(eventCreateCalls).toHaveLength(0);
  });

  it('writes metadata when provided', async () => {
    const engine = buildEngine({ readState: async () => 'A' });
    await engine.transition({
      aggregateType: 'test',
      aggregateId: '1',
      action: 'go',
      actorId: null,
      metadata: { docId: 'd1' },
    });
    expect(eventCreateCalls[0]).toMatchObject({ metadata: { docId: 'd1' } });
  });

  it('writes Prisma.DbNull when metadata is omitted', async () => {
    const engine = buildEngine({ readState: async () => 'A' });
    await engine.transition({
      aggregateType: 'test',
      aggregateId: '1',
      action: 'go',
      actorId: null,
    });
    const e = eventCreateCalls[0] as { metadata: unknown };
    expect(e.metadata).toEqual({ __DbNull: true });
  });
});
