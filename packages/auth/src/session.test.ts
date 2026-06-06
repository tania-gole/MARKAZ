import { describe, it, expect } from 'vitest';
import { generateSessionToken, hashSessionToken } from './session';

describe('generateSessionToken', () => {
  it('returns a base64url token (~43 chars) and a 64-char hex hash', () => {
    const { token, tokenHash } = generateSessionToken();
    // 32 random bytes base64url-encoded is 43 characters (no padding)
    expect(token).toHaveLength(43);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    // SHA-256 hex is 64 characters
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).toMatch(/^[a-f0-9]+$/);
  });

  it('produces different tokens each call (entropy smoke check)', () => {
    const a = generateSessionToken();
    const b = generateSessionToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).not.toBe(b.tokenHash);
  });

  it('returned tokenHash matches hashSessionToken(token)', () => {
    const { token, tokenHash } = generateSessionToken();
    expect(hashSessionToken(token)).toBe(tokenHash);
  });
});

describe('hashSessionToken', () => {
  it('is deterministic: same input -> same hash', () => {
    expect(hashSessionToken('fixed-test-token')).toBe(hashSessionToken('fixed-test-token'));
  });

  it('different tokens produce different hashes', () => {
    expect(hashSessionToken('a')).not.toBe(hashSessionToken('b'));
  });
});
