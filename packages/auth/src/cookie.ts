export const SESSION_COOKIE_NAME = 'markaz_session';

export function sessionCookieAttributes(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env['NODE_ENV'] === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
