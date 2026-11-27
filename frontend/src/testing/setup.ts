import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// jsdom lays nothing out, so nothing scrolls: its window.scrollTo only reports "not
// implemented". A mock instead, which tests of the scroll handling can read.
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// Tests use demo data unless a test switches to live mode (vi.stubEnv('VITE_API_MODE', 'live'))
beforeEach(() => vi.stubEnv('VITE_API_MODE', 'mock'));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  // Saved games, recent searches, the sound setting: each test starts with none.
  window.localStorage.clear();
  window.sessionStorage.clear();
});
