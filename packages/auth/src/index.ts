export { hashPassword, verifyPassword } from './password';
export { encryptEmiratesId, hashEmiratesId } from './encryption';
export {
  generateSessionToken,
  hashSessionToken,
  createSession,
  validateSessionToken,
  invalidateSession,
  SESSION_TTL_SECONDS,
} from './session';
export { registerUser, loginUser, logoutSession, getCurrentUser } from './operations';
export type { PublicUser } from './operations';
export {
  INTERNAL_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  splitPermission,
  userHasRole,
  userHasPermission,
  requirePermission,
} from './rbac';
export type { InternalRole, Permission } from './rbac';
export { seedRbac } from './rbac-seed';
export { SESSION_COOKIE_NAME, sessionCookieAttributes } from './cookie';
export { InvalidCredentialsError, EmailAlreadyExistsError } from './errors';
