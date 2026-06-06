import { registerAction } from '@/app/actions/auth';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <h1>Register</h1>
      {params.error === 'taken' && (
        <p role="alert">An account with that email already exists.</p>
      )}
      {params.error === 'invalid' && (
        <p role="alert">Please check your email and password (8+ characters).</p>
      )}
      <form action={registerAction}>
        <p>
          <label>
            Email
            <br />
            <input type="email" name="email" required autoComplete="email" />
          </label>
        </p>
        <p>
          <label>
            Password
            <br />
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
        </p>
        <button type="submit">Register</button>
      </form>
    </main>
  );
}
