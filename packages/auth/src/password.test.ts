import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('hashPassword', () => {
  it('returns a PHC-formatted argon2id string', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toBe(b);
  });
});

describe('verifyPassword', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('s3cret');
    expect(await verifyPassword('s3cret', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('s3cret');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects a near-miss (case-sensitive)', async () => {
    const hash = await hashPassword('Password');
    expect(await verifyPassword('password', hash)).toBe(false);
  });
});
