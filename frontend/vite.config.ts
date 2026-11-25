import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const BACKEND_URL = 'http://localhost:8000';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Requests to /api go to the backend (cd backend/app && uv run fastapi dev)
  server: { proxy: { '/api': BACKEND_URL } },
  preview: { proxy: { '/api': BACKEND_URL } },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/testing/setup.ts'],
    css: false,
    clearMocks: true,
    // Two levels, run and reported separately in CI (`vitest run --project unit`):
    // unit = logic, hooks and API clients (*.test.ts); integration = components and pages
    // rendered with the router, React Query and the API client (*.test.tsx).
    // Acceptance tests run the built app in a browser: e2e/ (Playwright).
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'] } },
      { extends: true, test: { name: 'integration', include: ['src/**/*.test.tsx'] } },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.fixtures.ts',
        'src/testing/**',
        'src/**/types/**', // type declarations only, no code to run
        'src/types/**',
        'src/**/*.d.ts',
        // not used by the app yet (reference for a live board)
        'src/components/chess/chess-artwork.tsx',
        'src/components/chess/live-chessboard.tsx',
      ],
      reporter: ['text-summary', 'html', 'lcov', 'json-summary', 'cobertura'],
      reportsDirectory: './coverage',
      // CI fails below these (measured: 99.3% lines, 92.0% branches, 95.8% functions).
      // They are for the whole suite: CI runs each project alone with PARTIAL_COVERAGE=1,
      // then checks them on the merged coverage (vitest run --merge-reports --coverage).
      thresholds: process.env.PARTIAL_COVERAGE
        ? undefined
        : { lines: 98, statements: 98, branches: 90, functions: 94 },
    },
  },
});
