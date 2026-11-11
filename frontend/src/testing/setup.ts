import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Tests use demo data unless a test switches to live mode (vi.stubEnv('VITE_API_MODE', 'live'))
beforeEach(() => vi.stubEnv('VITE_API_MODE', 'mock'));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
