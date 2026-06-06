// Internal roles per design rule 5. Buyer/seller are NOT roles — they emerge from
// ownership scoping (Listing.sellerId, Offer.buyerId, etc.), checked by userOwns.
export const INTERNAL_ROLES = ['Operations', 'Compliance', 'Support', 'Admin'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

// Week 1 stub. Returns false (fail-safe default: any accidental permission check
// before Week 2 wires the real query is denied loudly, not silently allowed).
// Week 2: query db.userRole.findFirst with role.name match.
export async function userHasRole(_userId: string, _role: InternalRole): Promise<boolean> {
  return false;
}

// Week 1 stub. Same fail-safe default.
// Week 2: switch on resource.type (listing, offer, transaction, document) and check
// the appropriate ownership column (sellerId, buyerId, party arrays, uploadedById).
export async function userOwns(
  _userId: string,
  _resource: { type: string; id: string },
): Promise<boolean> {
  return false;
}

// Two-layer combiner — both layers must pass for permission to be granted.
// role: null means no role guard required (any authenticated user).
// ownership: null means no ownership check required (cross-cutting action).
// Both null at once would mean "permit anyone authenticated" — callers shouldn't do that.
export async function requirePermission(
  userId: string,
  role: InternalRole | null,
  ownership: { type: string; id: string } | null,
): Promise<boolean> {
  if (role !== null && !(await userHasRole(userId, role))) return false;
  if (ownership !== null && !(await userOwns(userId, ownership))) return false;
  return true;
}
