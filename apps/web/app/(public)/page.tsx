import { validatePing, recordHealthCheck, latestHealthCheck } from '@markaz/core';

export const dynamic = 'force-dynamic';

export default async function Landing() {
  const validated = validatePing({ message: 'Markaz Home is wired end to end.' });
  await recordHealthCheck(validated.message);
  const latest = await latestHealthCheck();
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
    </main>
  );
}
