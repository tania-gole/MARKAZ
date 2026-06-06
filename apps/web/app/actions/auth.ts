'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  registerUser,
  loginUser,
  logoutSession,
  SESSION_COOKIE_NAME,
  sessionCookieAttributes,
  SESSION_TTL_SECONDS,
  InvalidCredentialsError,
  EmailAlreadyExistsError,
} from '@markaz/auth';
import { RegisterInputSchema, LoginInputSchema } from '@markaz/types';

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = RegisterInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect('/register?error=invalid');
  }

  const { token, expiresAt } = await registerUser(
    parsed.data.email,
    parsed.data.password,
  ).catch((err: unknown): never => {
    if (err instanceof EmailAlreadyExistsError) {
      redirect('/register?error=taken');
    }
    throw err;
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieAttributes(SESSION_TTL_SECONDS),
    expires: expiresAt,
  });
  redirect('/');
}

export async function loginAction(formData: FormData): Promise<void> {
  const parsed = LoginInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    redirect('/login?error=invalid');
  }

  const { token, expiresAt } = await loginUser(
    parsed.data.email,
    parsed.data.password,
  ).catch((err: unknown): never => {
    if (err instanceof InvalidCredentialsError) {
      redirect('/login?error=invalid');
    }
    throw err;
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    ...sessionCookieAttributes(SESSION_TTL_SECONDS),
    expires: expiresAt,
  });
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) await logoutSession(token);
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/');
}
