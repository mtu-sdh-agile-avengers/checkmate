/**
 * Where the pages get their data from:
 * - 'live': our backend API (FastAPI, `backend/app`)
 * - 'mock': built-in demo data from `lib/mock-api.ts` (no backend needed; default)
 *
 * Read on every call (not once at import) so tests can switch modes with `vi.stubEnv`.
 */
export type ApiMode = 'live' | 'mock';

export function getApiMode(): ApiMode {
  return import.meta.env.VITE_API_MODE === 'live' ? 'live' : 'mock';
}

/** Base URL of our API. The default goes through the Vite dev proxy (see vite.config.ts). */
export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');
}
