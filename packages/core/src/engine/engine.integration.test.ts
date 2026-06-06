import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db } from '@markaz/db';
import { createEngine, listingMachine, listingAdapter } from './index';
import { ConcurrentModificationError } from './errors';

const engine = createEngine({
  listing: { machine: listingMachine, adapter: listingAdapter },
});

let propertyId: string;

beforeAll(async () => {
  const p = await db.property.create({
    data: {
      type: 'apartment',
      bedrooms: 2,
      sizeSqft: '1200',
      location: 'Dubai Marina',
      deedRef: `engine-it-${Date.now()}`,
      deedType: 'TitleDeed',
    },
  });
  propertyId = p.id;
});

afterAll(async () => {
  await db.event.deleteMany({ where: { aggregateType: 'listing' } });
  await db.listing.deleteMany({ where: { propertyId } });
  await db.property.delete({ where: { id: propertyId } });
  await db.$disconnect();
});

async function createDraftListing(): Promise<string> {
  const l = await db.listing.create({
    data: { propertyId, askingPrice: '1000000', status: 'Draft' },
  });
  return l.id;
}

beforeEach(async () => {
  await db.event.deleteMany({ where: { aggregateType: 'listing' } });
  await db.listing.deleteMany({ where: { propertyId } });
});

describe('engine.transition — atomic status+event write', () => {
  it('updates status and inserts the event in one transaction', async () => {
    const id = await createDraftListing();
    const result = await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'completeDetails',
      actorId: 'test-actor',
      reason: 'details captured',
      metadata: { fields: ['type', 'beds'] },
    });

    expect(result.from).toBe('Draft');
    expect(result.to).toBe('PendingDocuments');

    const updated = await db.listing.findUnique({ where: { id } });
    expect(updated?.status).toBe('PendingDocuments');

    const events = await db.event.findMany({ where: { aggregateId: id } });
    expect(events).toHaveLength(1);
    const ev = events[0]!;
    expect(ev.aggregateType).toBe('listing');
    expect(ev.fromState).toBe('Draft');
    expect(ev.toState).toBe('PendingDocuments');
    expect(ev.actorId).toBe('test-actor');
    expect(ev.reason).toBe('details captured');
    expect(ev.metadata).toEqual({ fields: ['type', 'beds'] });
  });

  it('writes SQL NULL (not JSON null) when metadata is omitted', async () => {
    const id = await createDraftListing();
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'completeDetails',
      actorId: null,
    });
    const ev = await db.event.findFirst({ where: { aggregateId: id } });
    expect(ev?.metadata).toBeNull();
  });
});

describe('engine.transition — concurrency', () => {
  it('serialises two parallel transitions: one wins, one throws ConcurrentModificationError', async () => {
    const id = await createDraftListing();

    const [a, b] = await Promise.allSettled([
      engine.transition({
        aggregateType: 'listing',
        aggregateId: id,
        action: 'completeDetails',
        actorId: 'a',
      }),
      engine.transition({
        aggregateType: 'listing',
        aggregateId: id,
        action: 'completeDetails',
        actorId: 'b',
      }),
    ]);

    const fulfilled = [a, b].filter((r) => r.status === 'fulfilled');
    const rejected = [a, b].filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(
      ConcurrentModificationError,
    );

    // Exactly one event row was written (the loser's tx rolled back).
    const events = await db.event.findMany({ where: { aggregateId: id } });
    expect(events).toHaveLength(1);

    // The listing landed in the post-transition state.
    const updated = await db.listing.findUnique({ where: { id } });
    expect(updated?.status).toBe('PendingDocuments');
  });
});
