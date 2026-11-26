import { vi } from 'vitest';

/** Stubs window.matchMedia as a browser would answer it: motion allowed or reduced. */
export function stubMotion(reduced = false) {
  const media = {
    matches: reduced,
    media: '(prefers-reduced-motion: reduce)',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => media),
  );
  return media;
}
