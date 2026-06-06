import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { db } from '@markaz/db';
import { createEngine, listingMachine, listingAdapter } from './index';
import { GuardFailedError, IllegalTransitionError } from './errors';

const engine = createEngine({
  listing: { machine: listingMachine, adapter: listingAdapter },
});

let propertyId: string;

beforeAll(async () => {
  const p = await db.property.create({
    data: {
      type: 'apartment',
      bedrooms: 1,
      sizeSqft: '800',
      location: 'Downtown Dubai',
      deedRef: `listing-it-${Date.now()}`,
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

async function createListing(status = 'Draft'): Promise<string> {
  const l = await db.listing.create({
    data: { propertyId, askingPrice: '1000000', status },
  });
  return l.id;
}

beforeEach(async () => {
  await db.event.deleteMany({ where: { aggregateType: 'listing' } });
  await db.listing.deleteMany({ where: { propertyId } });
});

describe('listing machine — happy path', () => {
  it('walks Draft -> Live writing one event per step', async () => {
    const id = await createListing();
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'completeDetails',
      actorId: null,
    });
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'uploadDeed',
      actorId: null,
    });
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'verifyOwnership',
      actorId: 'ops-1',
    });
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'completeSignatures',
      actorId: null,
      guardContext: { signedOwnerIds: ['a'], totalOwnerIds: ['a'] },
    });
    await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'recordPermit',
      actorId: 'ops-1',
    });

    const finalListing = await db.listing.findUnique({ where: { id } });
    expect(finalListing?.status).toBe('Live');

    const events = await db.event.findMany({
      where: { aggregateId: id },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((e) => e.toState)).toEqual([
      'PendingDocuments',
      'PendingOwnershipReview',
      'PendingSignature',
      'PendingPermit',
      'Live',
    ]);
  });
});

describe('listing machine — guards and illegal transitions', () => {
  it('rejects completeSignatures when not all owners signed', async () => {
    const id = await createListing('PendingSignature');
    await expect(
      engine.transition({
        aggregateType: 'listing',
        aggregateId: id,
        action: 'completeSignatures',
        actorId: null,
        guardContext: { signedOwnerIds: ['a'], totalOwnerIds: ['a', 'b'] },
      }),
    ).rejects.toBeInstanceOf(GuardFailedError);

    const unchanged = await db.listing.findUnique({ where: { id } });
    expect(unchanged?.status).toBe('PendingSignature');

    const events = await db.event.findMany({ where: { aggregateId: id } });
    expect(events).toHaveLength(0);
  });

  it('rejects an action that has no transition from the current state', async () => {
    const id = await createListing('Live');
    await expect(
      engine.transition({
        aggregateType: 'listing',
        aggregateId: id,
        action: 'completeDetails',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(IllegalTransitionError);
  });

  it('allows withdraw from any pre-live state', async () => {
    const id = await createListing('PendingPermit');
    const result = await engine.transition({
      aggregateType: 'listing',
      aggregateId: id,
      action: 'withdraw',
      actorId: 'seller-1',
    });
    expect(result.to).toBe('Withdrawn');
  });
});
