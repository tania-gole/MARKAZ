import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
};

export const db = globalForPrisma.__prismaClient ?? new PrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__prismaClient = db;
}

// Re-export Prisma so consuming packages (@markaz/core, @markaz/auth, etc.)
// never import directly from '@prisma/client'. Single architectural seam:
// only @markaz/db knows about the underlying ORM. Includes both type
// members (Prisma.TransactionClient, Prisma.UserSelect, Prisma.InputJsonValue)
// and runtime sentinels (Prisma.DbNull, Prisma.JsonNull).
export { Prisma } from '@prisma/client';
export type { PrismaClient } from '@prisma/client';
