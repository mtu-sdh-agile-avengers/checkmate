import { describe, expect, it, vi } from 'vitest';
import { afterMotion, motionAllowed } from './motion';

const reducedMotion = (reduced: boolean) =>
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));

describe('motion', () => {
  it('plays only where it can be seen and is not reduced', () => {
    expect(motionAllowed()).toBe(false); // jsdom has no matchMedia
    reducedMotion(true);
    expect(afterMotion(300)).toBe(0);
    reducedMotion(false);
    expect(afterMotion(300)).toBe(300);
  });
});
