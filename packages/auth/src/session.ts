import { randomBytes, createHash } from 'node:crypto';
import { db } from '@markaz/db';

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export function generateSessionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashSessionToken(token) };
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(
  userId: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<{ token: string; expiresAt: Date }> {
  const { token, tokenHash } = generateSessionToken();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await db.session.create({ data: { userId, tokenHash, expiresAt } });
  return { token, expiresAt };
}

export async function validateSessionToken(rawToken: string) {
  const tokenHash = hashSessionToken(rawToken);
  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, email: true, createdAt: true, updatedAt: true },
      },
    },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) return null;
  return session;
}

export async function invalidateSession(rawToken: string): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await db.session.deleteMany({ where: { tokenHash } });
}
