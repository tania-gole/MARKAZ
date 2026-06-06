import { loginAction } from '@/app/actions/auth';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main>
      <h1>Log in</h1>
      {params.error === 'invalid' && <p role="alert">Invalid email or password.</p>}
      <form action={loginAction}>
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
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
        </p>
        <button type="submit">Log in</button>
      </form>
    </main>
  );
}
