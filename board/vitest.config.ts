import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest-setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // Playwright tests - run separately via npm run test:e2e
      // WIP: feature-archive step tests use dynamic imports - re-enable when fixed
      'src/__tests__/acceptance/feature-archive/steps/**',
    ],
  },
});
