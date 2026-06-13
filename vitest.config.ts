import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Scoped to the Smart System module so it never interferes with the app build.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/smart_system/**/*.test.ts'],
  },
});
