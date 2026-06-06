import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/src/**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**'],
    // Integration tests share DB state. Serial per file keeps the per-test
    // cleanup deterministic without per-test schema isolation.
    fileParallelism: false,
  },
});
