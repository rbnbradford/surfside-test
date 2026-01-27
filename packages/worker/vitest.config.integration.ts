// vitest.config.e2e.ts

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    globalSetup: './test/integration/setup.ts',
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'threads',
    fileParallelism: true,
    sequence: {
      concurrent: true,
    },
  },
});
