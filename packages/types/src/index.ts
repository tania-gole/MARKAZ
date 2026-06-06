import { z } from 'zod';

export const PingSchema = z.object({
  message: z.string().min(1),
});

export type Ping = z.infer<typeof PingSchema>;

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

/**
 * Shared access-denied error. Thrown by @markaz/auth's requirePermission and
 * @markaz/core's requireOwnership so route handlers can `catch (err instanceof
 * ForbiddenError)` regardless of which check denied. Lives in @markaz/types so
 * neither auth nor core needs the other as a dep just for the error class.
 */
export class ForbiddenError extends Error {
  constructor(public readonly reason: string) {
    super(`Forbidden: ${reason}`);
    this.name = 'ForbiddenError';
  }
}
