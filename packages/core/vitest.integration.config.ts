import { defineConfig } from 'vitest/config';

// Integration tests share DB state across files (per-test cleanup, per-aggregate
// scoping). Run them serially to keep tests deterministic without paying for
// schema-per-test isolation overhead.
export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['**/src/**/*.integration.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/.turbo/**'],
    fileParallelism: false,
  },
});
