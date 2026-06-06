import { PingSchema, type Ping } from '@markaz/types';
import { db } from '@markaz/db';

export function validatePing(input: unknown): Ping {
  return PingSchema.parse(input);
}

export async function recordHealthCheck(message: string) {
  return db.healthCheck.create({ data: { message } });
}

export async function latestHealthCheck() {
  return db.healthCheck.findFirst({ orderBy: { createdAt: 'desc' } });
}
