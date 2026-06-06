import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  __prismaClient: PrismaClient | undefined;
};

export const db = globalForPrisma.__prismaClient ?? new PrismaClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalForPrisma.__prismaClient = db;
}

export type { PrismaClient } from '@prisma/client';
