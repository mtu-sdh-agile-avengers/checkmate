import { defineConfig, devices } from '@playwright/test';

/**
 * Acceptance tests: the BUILT app (`npm run build` with VITE_API_MODE=live) in a real browser,
 * talking to the real backend in dev mode (mock Chess.com data; Stockfish when
 * STOCKFISH_PATH is set). They check the non-functional requirements: loading time, page
 * weight, response times, memory and console errors. Run: `npm run test:e2e`.
 */
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: CI ? 1 : 0,
  workers: 1, // timings are measured: one browser at a time
  reporter: CI
    ? [
        ['list'],
        ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
        ['html', { open: 'never' }],
      ]
    : [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 860 } },
    },
  ],
  webServer: [
    {
      command: 'uv run uvicorn src.main:app --port 8000',
      cwd: '../backend/app',
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: !CI,
      timeout: 120_000,
      env: {
        RUN_MODE: 'dev',
        API_CHESSCOM_BASE_URL: 'https://api.chess.com/pub',
        API_CHESSCOM_USER_AGENT: 'checkmate-e2e/1.0',
      },
    },
    {
      command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !CI,
      timeout: 60_000,
    },
  ],
});
