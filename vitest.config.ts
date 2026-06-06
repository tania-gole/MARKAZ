import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/src/**/*.test.{ts,tsx}'],
    // Integration tests (DB-touching) are excluded from the default run.
    // When CI gains a Postgres service in Week 2+, switch them in via a separate command.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/*.integration.test.{ts,tsx}',
    ],
  },
});
