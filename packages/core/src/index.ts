import { PingSchema, type Ping } from '@markaz/types';
import { db } from '@markaz/db';

export * from './engine';
export * from './ledger';
export * from './rbac';

export function validatePing(input: unknown): Ping {
  return PingSchema.parse(input);
}

export async function recordHealthCheck(message: string) {
  return db.healthCheck.create({ data: { message } });
}

export async function latestHealthCheck() {
  return db.healthCheck.findFirst({ orderBy: { createdAt: 'desc' } });
}

// Block G proof: typed Prisma client knows about the new Property model and
// the chain types -> core -> db works end-to-end against the migrated schema.
// Returns 0 today; once features land that create Properties, this lights up.
export async function propertyCount(): Promise<number> {
  return db.property.count();
}
