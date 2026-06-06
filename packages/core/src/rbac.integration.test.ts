// TDD spec for the userOwns + requireOwnership implementation. Currently
// fails against the placeholder stub; should pass once the real Block K
// implementation lands.

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@markaz/db';
import { ForbiddenError } from '@markaz/types';
import { userOwns, requireOwnership, type ResourceType } from './rbac';

// Per-test isolation: every helper creates rows with random ids so tests
// don't share state. afterAll disconnects.

async function createUserWithParty(): Promise<{ userId: string; partyId: string }> {
  const user = await db.user.create({
    data: {
      email: `rbac-core-${randomUUID()}@example.com`,
      passwordHash: 'fake-not-a-real-hash',
      party: { create: { kind: 'person' } },
    },
    select: { id: true, partyId: true },
  });
  return { userId: user.id, partyId: user.partyId };
}

async function createProperty(): Promise<string> {
  const p = await db.property.create({
    data: {
      type: 'apartment',
      bedrooms: 1,
      sizeSqft: '800',
      location: 'Test',
      deedRef: `rbac-${randomUUID()}`,
      deedType: 'TitleDeed',
    },
    select: { id: true },
  });
  return p.id;
}

async function makeOwner(partyId: string, propertyId: string): Promise<void> {
  await db.ownership.create({
    data: { propertyId, ownerId: partyId, share: '1.0' },
  });
}

async function createListing(propertyId: string): Promise<string> {
  const l = await db.listing.create({
    data: { propertyId, askingPrice: '1000000', status: 'Draft' },
    select: { id: true },
  });
  return l.id;
}

async function createOffer(listingId: string, buyerPartyId: string): Promise<string> {
  const o = await db.offer.create({
    data: {
      listingId,
      buyerId: buyerPartyId,
      amount: '1000000',
      financingMethod: 'cash',
      status: 'submitted',
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    },
    select: { id: true },
  });
  return o.id;
}

beforeEach(async () => {
  // No across-test cleanup needed — tests use random ids per row — but keep
  // a hook in case future tests want it.
});

afterAll(async () => {
  await db.$disconnect();
});

describe('userOwns — property', () => {
  it('returns true when an Ownership row links user.partyId to the property', async () => {
    const { userId, partyId } = await createUserWithParty();
    const propertyId = await createProperty();
    await makeOwner(partyId, propertyId);
    expect(await userOwns(userId, { type: 'property', id: propertyId })).toBe(true);
  });

  it('returns false when no Ownership row exists', async () => {
    const { userId } = await createUserWithParty();
    const propertyId = await createProperty();
    expect(await userOwns(userId, { type: 'property', id: propertyId })).toBe(false);
  });
});

describe('userOwns — listing', () => {
  it("returns true when user.partyId owns the listing's property", async () => {
    const { userId, partyId } = await createUserWithParty();
    const propertyId = await createProperty();
    await makeOwner(partyId, propertyId);
    const listingId = await createListing(propertyId);
    expect(await userOwns(userId, { type: 'listing', id: listingId })).toBe(true);
  });

  it("returns false when user.partyId does not own the listing's property", async () => {
    const { userId } = await createUserWithParty();
    const propertyId = await createProperty();
    const listingId = await createListing(propertyId);
    expect(await userOwns(userId, { type: 'listing', id: listingId })).toBe(false);
  });
});

describe('userOwns — offer', () => {
  it('returns true when user.partyId is the offer buyer', async () => {
    const { userId, partyId } = await createUserWithParty();
    const propertyId = await createProperty();
    const listingId = await createListing(propertyId);
    const offerId = await createOffer(listingId, partyId);
    expect(await userOwns(userId, { type: 'offer', id: offerId })).toBe(true);
  });

  it("returns false when user.partyId is not the offer's buyer", async () => {
    const { userId } = await createUserWithParty();
    const { partyId: otherParty } = await createUserWithParty();
    const propertyId = await createProperty();
    const listingId = await createListing(propertyId);
    const offerId = await createOffer(listingId, otherParty);
    expect(await userOwns(userId, { type: 'offer', id: offerId })).toBe(false);
  });
});

describe('userOwns — fail closed', () => {
  it('returns false for an unknown userId', async () => {
    expect(
      await userOwns('00000000-0000-0000-0000-000000000000', {
        type: 'property',
        id: '00000000-0000-0000-0000-000000000000',
      }),
    ).toBe(false);
  });

  it('returns false for an unknown ResourceType (cast bypasses TS)', async () => {
    const { userId } = await createUserWithParty();
    expect(
      await userOwns(userId, {
        type: 'transaction' as ResourceType,
        id: 'any',
      }),
    ).toBe(false);
  });

  it('returns false for a known resource type but missing resource id', async () => {
    const { userId } = await createUserWithParty();
    expect(
      await userOwns(userId, {
        type: 'property',
        id: '00000000-0000-0000-0000-000000000000',
      }),
    ).toBe(false);
  });
});

describe('requireOwnership', () => {
  it('throws ForbiddenError when user does not own', async () => {
    const { userId } = await createUserWithParty();
    const propertyId = await createProperty();
    await expect(
      requireOwnership(userId, { type: 'property', id: propertyId }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('resolves (no throw) when user owns', async () => {
    const { userId, partyId } = await createUserWithParty();
    const propertyId = await createProperty();
    await makeOwner(partyId, propertyId);
    await expect(
      requireOwnership(userId, { type: 'property', id: propertyId }),
    ).resolves.toBeUndefined();
  });
});
