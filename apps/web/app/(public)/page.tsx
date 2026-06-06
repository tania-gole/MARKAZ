import { cookies } from 'next/headers';
import Link from 'next/link';
import { validatePing, recordHealthCheck, latestHealthCheck } from '@markaz/core';
import { getCurrentUser, SESSION_COOKIE_NAME } from '@markaz/auth';
import { logoutAction } from '@/app/actions/auth';

export const dynamic = 'force-dynamic';

export default async function Landing() {
  const validated = validatePing({ message: 'Markaz Home is wired end to end.' });
  await recordHealthCheck(validated.message);
  const latest = await latestHealthCheck();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await getCurrentUser(token);

  return (
    <main>
      <h1>{validated.message}</h1>
      <p>types -&gt; core -&gt; db -&gt; web, validated by Zod, persisted via Prisma.</p>
      {latest && (
        <p>
          Last health check from DB: <code>{latest.message}</code> at{' '}
          <time>{latest.createdAt.toISOString()}</time>
        </p>
      )}
      <section>
        {user ? (
          <>
            <p>
              Logged in as <code>{user.email}</code>
            </p>
            <form action={logoutAction}>
              <button type="submit">Log out</button>
            </form>
          </>
        ) : (
          <>
            <p>Not logged in.</p>
            <p>
              <Link href="/login">Log in</Link> · <Link href="/register">Register</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
