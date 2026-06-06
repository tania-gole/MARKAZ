import { hash, verify } from '@node-rs/argon2';

// @node-rs/argon2 defaults to argon2id (the OWASP-recommended variant).
// We rely on that default rather than passing Algorithm.Argon2id explicitly
// because the library's Algorithm export is a `const enum`, which our
// verbatimModuleSyntax: true flag rejects (no runtime ambient enums).
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return verify(hashed, plain);
}
