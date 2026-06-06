import { db } from '@markaz/db';
import { ForbiddenError } from '@markaz/types';

// Internal roles per design rule 5. Buyer/seller are NOT roles — they emerge
// from ownership scoping (checked via @markaz/core's userOwns), not from the
// Role table. The seed creates exactly these four rows and nothing else; a
// unit test asserts the set.
export const INTERNAL_ROLES = ['Operations', 'Compliance', 'Support', 'Admin'] as const;
export type InternalRole = (typeof INTERNAL_ROLES)[number];

/**
 * Permission registry. Naming convention: `<resource>.<action>` (single dot).
 * Adding a permission is a code change here + a ROLE_PERMISSIONS update + the
 * seed re-run to upsert the new rows. Never a Postgres ALTER TYPE.
 */
export const PERMISSIONS = [
  'listing.verify_ownership',
  'listing.reject_ownership',
  'listing.record_permit',
  'listing.deny_permit',
  'listing.view_sensitive_docs',
  'admin.manage_users',
  'admin.manage_roles',
  'dashboard.view_revenue',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Role -> Permissions mapping. The canonical RBAC matrix as code.
 *
 * Admin is an explicit list, not a wildcard bypass. A wildcard "if hasRole
 * Admin return true" inside userHasPermission would be exactly the kind of
 * special case that gets forgotten and becomes a privilege-escalation
 * vector. Explicit listing makes "what can Admin do" reviewable in one
 * place. Cost: updating Admin's list when a permission is added. Worth it.
 *
 * Support starts empty in Block K; concrete Support permissions land with
 * the relevant features (Week 5+).
 */
export const ROLE_PERMISSIONS: Record<InternalRole, readonly Permission[]> = {
  Operations: [
    'listing.verify_ownership',
    'listing.reject_ownership',
    'listing.record_permit',
    'listing.deny_permit',
    'listing.view_sensitive_docs',
    'dashboard.view_revenue',
  ],
  Compliance: [
    'listing.verify_ownership',
    'listing.reject_ownership',
    'listing.view_sensitive_docs',
    'dashboard.view_revenue',
  ],
  Support: [],
  Admin: [
    'listing.verify_ownership',
    'listing.reject_ownership',
    'listing.record_permit',
    'listing.deny_permit',
    'listing.view_sensitive_docs',
    'admin.manage_users',
    'admin.manage_roles',
    'dashboard.view_revenue',
  ],
};

/**
 * Split a permission code into its resource + action halves. The Permission
 * DB row stores them as separate columns with @@unique([action, resource]),
 * so the seed and the userHasPermission query both round-trip via this.
 */
export function splitPermission(p: Permission): { resource: string; action: string } {
  const [resource, ...rest] = p.split('.');
  return { resource: resource ?? '', action: rest.join('.') };
}

/**
 * Has the user been assigned an internal role? Real query against UserRole
 * join + Role.name match. Fail-closed on unknown user / no matching role.
 *
 * Direct role check stays in the API for the rare case where a route truly
 * cares about the role (e.g. "this dashboard panel is Admin-only"). The
 * default is permission-based via userHasPermission.
 */
export async function userHasRole(userId: string, role: InternalRole): Promise<boolean> {
  const count = await db.userRole.count({
    where: { userId, role: { name: role } },
  });
  return count > 0;
}

/**
 * Has the user a specific permission via any of their roles? Fail-closed on:
 *   - unknown user
 *   - unknown permission (not in PERMISSIONS — TS catches this at compile
 *     time, runtime is the safety net)
 *   - no role-permission link reaching this permission
 */
export async function userHasPermission(
  userId: string,
  permission: Permission,
): Promise<boolean> {
  if (!(PERMISSIONS as readonly string[]).includes(permission)) return false;
  const { resource, action } = splitPermission(permission);
  const count = await db.user.count({
    where: {
      id: userId,
      roles: {
        some: {
          role: {
            permissions: {
              some: { permission: { action, resource } },
            },
          },
        },
      },
    },
  });
  return count > 0;
}

/**
 * Permission gate for route handlers. Throws ForbiddenError when the user
 * lacks the permission. Sugar over userHasPermission.
 *
 * Ownership gating is a separate primitive (requireOwnership in @markaz/core).
 * Route handlers compose the two per action — AND, OR, conditional — rather
 * than this module providing a combined canUserDoX.
 */
export async function requirePermission(userId: string, permission: Permission): Promise<void> {
  if (!(await userHasPermission(userId, permission))) {
    throw new ForbiddenError(`user ${userId} lacks permission "${permission}"`);
  }
}
