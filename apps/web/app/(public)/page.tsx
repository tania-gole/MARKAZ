import { validatePing } from '@markaz/core';

export default function Landing() {
  const result = validatePing({ message: 'Markaz Home is wired end to end.' });
  return (
    <main>
      <h1>{result.message}</h1>
      <p>types -&gt; core -&gt; web, validated by Zod, transpiled by Next.</p>
    </main>
  );
}
