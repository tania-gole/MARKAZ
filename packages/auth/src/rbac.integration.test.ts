// DB-backed tests for the RBAC primitives. Runs against the Postgres service
// in CI and local docker compose. Each test cleans up its own UserRole rows
// so role assignments don't leak between tests; the seed (Role / Permission /
// RolePermission) is idempotent so beforeAll seeding once is enough.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '@markaz/db';
import { ForbiddenError } from '@markaz/types';
import {
  INTERNAL_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  requirePermission,
  userHasPermission,
  userHasRole,
  type InternalRole,
  type Permission,
} from './rbac';
import { seedRbac } from './rbac-seed';

beforeAll(async () => {
  await seedRbac();
});

beforeEach(async () => {
  // Per-test cleanup: drop role assignments. Don't touch the seed rows.
  await db.userRole.deleteMany({});
});

afterAll(async () => {
  await db.$disconnect();
});

async function createUser(): Promise<string> {
  const user = await db.user.create({
    data: {
      email: `rbac-${randomUUID()}@example.com`,
      passwordHash: 'fake-not-a-real-hash',
      party: { create: { kind: 'person' } },
    },
    select: { id: true },
  });
  return user.id;
}

async function assignRole(userId: string, role: InternalRole): Promise<void> {
  const r = await db.role.findUniqueOrThrow({ where: { name: role } });
  await db.userRole.create({ data: { userId, roleId: r.id } });
}

describe('seedRbac', () => {
  it('seeds exactly the four internal roles (no buyer / seller)', async () => {
    const roles = await db.role.findMany({ select: { name: true } });
    expect(roles.map((r) => r.name).sort()).toEqual([...INTERNAL_ROLES].sort());
  });

  it('seeds every PERMISSION in the registry', async () => {
    const count = await db.permission.count();
    expect(count).toBeGreaterThanOrEqual(PERMISSIONS.length);
  });

  it('seeds the right number of RolePermission rows', async () => {
    const expected = Object.values(ROLE_PERMISSIONS).reduce((s, p) => s + p.length, 0);
    const count = await db.rolePermission.count();
    expect(count).toBe(expected);
  });

  it('is idempotent (rerun creates no new rows)', async () => {
    const before = {
      roles: await db.role.count(),
      perms: await db.permission.count(),
      links: await db.rolePermission.count(),
    };
    await seedRbac();
    const after = {
      roles: await db.role.count(),
      perms: await db.permission.count(),
      links: await db.rolePermission.count(),
    };
    expect(after).toEqual(before);
  });
});

describe('userHasRole', () => {
  it('returns true when the user has the role', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Operations');
    expect(await userHasRole(userId, 'Operations')).toBe(true);
  });

  it('returns false when the user does not have the role', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Operations');
    expect(await userHasRole(userId, 'Compliance')).toBe(false);
  });

  it('returns false for an unknown user (fail-closed)', async () => {
    expect(await userHasRole('nonexistent-user-id', 'Admin')).toBe(false);
  });
});

describe('userHasPermission', () => {
  it('returns true when the user has a role that grants the permission', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Operations');
    // Operations grants listing.verify_ownership per ROLE_PERMISSIONS
    expect(await userHasPermission(userId, 'listing.verify_ownership')).toBe(true);
  });

  it('returns true when the user has any of several granting roles', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Admin');
    expect(await userHasPermission(userId, 'admin.manage_users')).toBe(true);
  });

  it('returns false when the user has a role but it does not grant this permission', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Compliance');
    // Compliance does NOT have admin.manage_users
    expect(await userHasPermission(userId, 'admin.manage_users')).toBe(false);
  });

  it('returns false when the user has Support (empty permission set in Block K)', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Support');
    expect(await userHasPermission(userId, 'listing.verify_ownership')).toBe(false);
  });

  it('returns false for an unknown user (fail-closed)', async () => {
    expect(await userHasPermission('nonexistent-user-id', 'listing.verify_ownership')).toBe(
      false,
    );
  });

  it('returns false for a permission not in PERMISSIONS (fail-closed)', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Admin');
    expect(
      await userHasPermission(userId, 'fictional.permission' as Permission),
    ).toBe(false);
  });
});

describe('requirePermission', () => {
  it('throws ForbiddenError when permission absent', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Support');
    await expect(
      requirePermission(userId, 'listing.verify_ownership'),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('resolves (no throw) when permission present', async () => {
    const userId = await createUser();
    await assignRole(userId, 'Operations');
    await expect(
      requirePermission(userId, 'listing.verify_ownership'),
    ).resolves.toBeUndefined();
  });
});
