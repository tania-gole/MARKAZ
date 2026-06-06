// Pure unit tests for the RBAC registry shape. No DB — the integration tests
// cover the queries.

import { describe, it, expect } from 'vitest';
import {
  INTERNAL_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  splitPermission,
} from './rbac';

describe('INTERNAL_ROLES', () => {
  it('is exactly Operations, Compliance, Support, Admin (no buyer / seller)', () => {
    expect([...INTERNAL_ROLES].sort()).toEqual(['Admin', 'Compliance', 'Operations', 'Support']);
  });
});

describe('PERMISSIONS', () => {
  it('is non-empty', () => {
    expect(PERMISSIONS.length).toBeGreaterThan(0);
  });

  it('has no duplicates', () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it('every permission contains exactly one dot (seed splits on .)', () => {
    for (const p of PERMISSIONS) {
      const dots = (p.match(/\./g) ?? []).length;
      expect(dots).toBe(1);
    }
  });

  it('every permission has a non-empty resource and action half', () => {
    for (const p of PERMISSIONS) {
      const { resource, action } = splitPermission(p);
      expect(resource.length).toBeGreaterThan(0);
      expect(action.length).toBeGreaterThan(0);
    }
  });
});

describe('ROLE_PERMISSIONS', () => {
  it('has exactly the four INTERNAL_ROLES as keys', () => {
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual([...INTERNAL_ROLES].sort());
  });

  it('every listed permission is in the PERMISSIONS registry', () => {
    const known = new Set<string>(PERMISSIONS);
    for (const [, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(known.has(p)).toBe(true);
      }
    }
  });

  it('per-role permission lists have no internal duplicates', () => {
    for (const [, perms] of Object.entries(ROLE_PERMISSIONS)) {
      expect(new Set(perms).size).toBe(perms.length);
    }
  });

  it('Admin lists every permission explicitly (no wildcard bypass)', () => {
    expect([...ROLE_PERMISSIONS.Admin].sort()).toEqual([...PERMISSIONS].sort());
  });
});

describe('splitPermission', () => {
  it('splits "listing.verify_ownership" into resource + action', () => {
    expect(splitPermission('listing.verify_ownership')).toEqual({
      resource: 'listing',
      action: 'verify_ownership',
    });
  });

  it('splits "admin.manage_users" into resource + action', () => {
    expect(splitPermission('admin.manage_users')).toEqual({
      resource: 'admin',
      action: 'manage_users',
    });
  });
});
