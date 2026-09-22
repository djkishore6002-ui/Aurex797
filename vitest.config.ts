import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // node:sqlite is experimental → Vite's resolver can't handle it in Vitest.
      'node:sqlite': path.resolve(__dirname, './src/test-shims/node-sqlite.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
