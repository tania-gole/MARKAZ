import { db } from '@markaz/db';
import { ForbiddenError } from '@markaz/types';

/**
 * RBAC ownership layer (the second of two composable layers — the first is
 * @markaz/auth's permission layer). Route handlers compose requirePermission
 * and requireOwnership per action; this module knows nothing about roles or
 * permissions, only about who owns what.
 *
 * Transaction is intentionally NOT in ResourceType. Ownership transfers
 * post-sale, so resolving access via current Property.ownerships would lock
 * the seller out of their own completed deal. Transaction parties resolve
 * from the transaction's own party snapshot when that feature lands
 * (Week 5/6).
 */

export type ResourceType = 'property' | 'listing' | 'offer';
export type ResourceRef = { type: ResourceType; id: string };

type OwnershipResolver = (partyId: string, resourceId: string) => Promise<boolean>;

/**
 * Per-resource resolvers. No big switch; adding a resource type is a new
 * registry entry, matching the engine's persistence-adapter pattern.
 *
 * "Any stake = owner" — the presence of an Ownership row is the signal,
 * not the share. Share weighting (who gets how much of the payout) is
 * feature logic, not access control.
 */
const OWNERSHIP_RESOLVERS: Record<ResourceType, OwnershipResolver> = {
  property: async (partyId, propertyId) => {
    const count = await db.ownership.count({
      where: { ownerId: partyId, propertyId },
    });
    return count > 0;
  },
  listing: async (partyId, listingId) => {
    // Listing ownership = ownership of its underlying Property. Single
    // nested query rather than two roundtrips.
    const count = await db.ownership.count({
      where: {
        ownerId: partyId,
        property: { listings: { some: { id: listingId } } },
      },
    });
    return count > 0;
  },
  offer: async (partyId, offerId) => {
    // Buyer-side: the offer's buyerId is this party. Single FK comparison.
    const offer = await db.offer.findUnique({
      where: { id: offerId },
      select: { buyerId: true },
    });
    return offer !== null && offer.buyerId === partyId;
  },
};

/**
 * Does the user own the resource? Resolves User -> partyId -> per-resource
 * ownership check.
 *
 * Fail-closed on every edge:
 *   - unknown user                    -> false
 *   - user.partyId missing/falsy      -> false (defence in depth; the schema
 *                                       constrains partyId to non-null after
 *                                       the require_user_party migration, but
 *                                       trust nothing — a raw SQL insert or a
 *                                       future schema regression must still
 *                                       deny access, not grant it)
 *   - unknown ResourceType            -> false (TS catches at compile time;
 *                                       runtime is the safety net for casts)
 *   - resolver returns false          -> false (the honest "not an owner"
 *                                       case)
 */
export async function userOwns(userId: string, resource: ResourceRef): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { partyId: true },
  });
  if (!user || !user.partyId) return false;

  const resolver = OWNERSHIP_RESOLVERS[resource.type];
  if (!resolver) return false;

  return resolver(user.partyId, resource.id);
}

/**
 * Ownership gate for route handlers. Throws ForbiddenError when userOwns
 * returns false. Sugar over userOwns; lets handlers `await` it inline
 * instead of branching on a boolean.
 */
export async function requireOwnership(userId: string, resource: ResourceRef): Promise<void> {
  if (!(await userOwns(userId, resource))) {
    throw new ForbiddenError(`user ${userId} does not own ${resource.type} ${resource.id}`);
  }
}
