import { db } from '@markaz/db';
import type { User } from '@prisma/client';
import { hashPassword, verifyPassword } from './password';
import { createSession, invalidateSession, validateSessionToken } from './session';
import { InvalidCredentialsError, EmailAlreadyExistsError } from './errors';

// Public-facing user shape. passwordHash is stripped at RUNTIME (destructured out)
// before any return — never relying on this type alone to remove it.
export type PublicUser = Omit<User, 'passwordHash'>;

// Constant-time login: even when the email isn't found, we still run argon2 verify
// against a dummy hash so the response time is indistinguishable from "wrong password".
// Otherwise an attacker could enumerate registered emails by timing the login endpoint.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$X1pYIO7iAH9bL+nC8+pVk2YlAY/EfFnTbgkfGTwxnzs';

export async function registerUser(
  email: string,
  plainPassword: string,
): Promise<{ user: PublicUser; token: string; expiresAt: Date }> {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new EmailAlreadyExistsError();

  const passwordHash = await hashPassword(plainPassword);
  const user = await db.user.create({ data: { email, passwordHash } });
  const { token, expiresAt } = await createSession(user.id);

  // Runtime strip: destructure passwordHash out so it cannot be serialised to the client.
  const { passwordHash: _stripped, ...publicUser } = user;
  return { user: publicUser, token, expiresAt };
}

export async function loginUser(
  email: string,
  plainPassword: string,
): Promise<{ user: PublicUser; token: string; expiresAt: Date }> {
  const user = await db.user.findUnique({ where: { email } });

  // Always run verify — with the real hash if user exists, else the dummy — so timing
  // doesn't reveal whether the email is registered.
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(plainPassword, hashToCheck);

  if (!user || !ok) throw new InvalidCredentialsError();

  const { token, expiresAt } = await createSession(user.id);
  const { passwordHash: _stripped, ...publicUser } = user;
  return { user: publicUser, token, expiresAt };
}

export async function logoutSession(rawToken: string): Promise<void> {
  await invalidateSession(rawToken);
}

export async function getCurrentUser(rawToken: string | undefined): Promise<PublicUser | null> {
  if (!rawToken) return null;
  const session = await validateSessionToken(rawToken);
  if (!session) return null;
  // validateSessionToken already projects user with explicit select (no passwordHash).
  return session.user;
}
