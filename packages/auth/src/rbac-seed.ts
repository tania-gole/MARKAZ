import { db } from '@markaz/db';
import {
  INTERNAL_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  splitPermission,
  type InternalRole,
  type Permission,
} from './rbac';

/**
 * Idempotent seed of the RBAC matrix: the four internal roles, the
 * declared permissions, and the role-permission links from ROLE_PERMISSIONS.
 *
 * All operations are upserts on unique keys, so re-running creates no new
 * rows. Safe to call in dev script + every integration test's beforeAll.
 *
 * Upsert unique keys (verified against schema.prisma):
 *   - Role.name (@unique)
 *   - Permission(action, resource) (@@unique([action, resource]))
 *   - RolePermission(roleId, permissionId) (@@id composite key)
 */
export async function seedRbac(): Promise<void> {
  // 1. Roles — exactly the four internal roles, no buyer / seller / etc.
  for (const role of INTERNAL_ROLES) {
    await db.role.upsert({
      where: { name: role },
      create: { name: role },
      update: {},
    });
  }

  // 2. Permissions — every entry in PERMISSIONS.
  for (const permission of PERMISSIONS) {
    const { resource, action } = splitPermission(permission);
    await db.permission.upsert({
      where: { action_resource: { action, resource } },
      create: { action, resource },
      update: {},
    });
  }

  // 3. RolePermission links — the matrix.
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS) as [
    InternalRole,
    readonly Permission[],
  ][]) {
    const role = await db.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const permission of perms) {
      const { resource, action } = splitPermission(permission);
      const permRow = await db.permission.findUniqueOrThrow({
        where: { action_resource: { action, resource } },
      });
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permRow.id },
        },
        create: { roleId: role.id, permissionId: permRow.id },
        update: {},
      });
    }
  }
}
