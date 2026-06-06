import { db } from '@markaz/db';
import { hashPassword, verifyPassword } from './password';
import {
  createSession,
  invalidateSession,
  validateSessionToken,
  PUBLIC_USER_SELECT,
  type PublicUser,
} from './session';
import { InvalidCredentialsError, EmailAlreadyExistsError } from './errors';

export type { PublicUser };

// Constant-time login: even when the email isn't found, we still run argon2 verify
// against a dummy hash so the response time is indistinguishable from "wrong password".
// Otherwise an attacker could enumerate registered emails by timing the login endpoint.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$X1pYIO7iAH9bL+nC8+pVk2YlAY/EfFnTbgkfGTwxnzs';

export async function registerUser(
  email: string,
  plainPassword: string,
): Promise<{ user: PublicUser; token: string; expiresAt: Date }> {
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw new EmailAlreadyExistsError();

  const passwordHash = await hashPassword(plainPassword);
  // select PUBLIC_USER_SELECT projects to exactly PublicUser at the DB level —
  // passwordHash / emiratesIdEnc / emiratesIdHash never enter memory in this code path.
  // Nested create on `party` makes both rows in one DB transaction; every
  // registered User has a Party of kind 'person', satisfying the required
  // partyId column (post require_user_party migration).
  const user = await db.user.create({
    data: { email, passwordHash, party: { create: { kind: 'person' } } },
    select: PUBLIC_USER_SELECT,
  });
  const { token, expiresAt } = await createSession(user.id);
  return { user, token, expiresAt };
}

export async function loginUser(
  email: string,
  plainPassword: string,
): Promise<{ user: PublicUser; token: string; expiresAt: Date }> {
  // Need passwordHash to verify, so explicitly include it alongside the PublicUser fields.
  // We strip it via destructure before returning — RSC can't serialise what isn't in the object.
  const user = await db.user.findUnique({
    where: { email },
    select: { ...PUBLIC_USER_SELECT, passwordHash: true },
  });

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
  // validateSessionToken's select already projects to PUBLIC_USER_SELECT.
  return session.user;
}
