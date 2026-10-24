import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/global-setup.ts'],
    // e2e suites share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
  // SWC emits the decorator metadata Nest's dependency injection relies on.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
