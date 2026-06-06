/**
 * Dev / production-init invocation of seedRbac.
 *
 * Run via `pnpm db:seed` at the workspace root (loads .env), or
 * `pnpm --filter @markaz/auth db:seed` direct.
 *
 * The seed is idempotent: re-runs upsert nothing new. Safe to invoke
 * repeatedly.
 */
import { seedRbac } from '../src/rbac-seed';
import { db } from '@markaz/db';

async function main() {
  console.log('Seeding RBAC matrix...');
  await seedRbac();
  console.log('RBAC seeded.');
  await db.$disconnect();
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
