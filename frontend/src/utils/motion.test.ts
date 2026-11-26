import { describe, expect, it, vi } from 'vitest';
import { afterMotion, afterTransition, motionAllowed, motionReduced } from './motion';

// (the test setup unstubs matchMedia after each test)
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

  it('falls back to a simple fade with reduced motion, and to nothing where nothing is displayed', () => {
    expect(motionReduced()).toBe(false);
    expect(afterTransition(800, 300)).toBe(0);
    reducedMotion(true);
    expect(motionReduced()).toBe(true);
    expect(afterTransition(800, 300)).toBe(300);
    reducedMotion(false);
    expect(afterTransition(800, 300)).toBe(800);
  });
});
