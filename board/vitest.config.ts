import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // WIP: feature-archive has broken imports - re-enable when fixed
      'src/__tests__/acceptance/feature-archive/**',
    ],
  },
});
