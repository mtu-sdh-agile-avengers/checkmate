import { describe, expect, it } from 'vitest';
import {
  formatEloChange,
  formatRating,
  formatTimeControl,
  formatUtc,
  signedNumber,
} from './format';

describe('format', () => {
  it('shows missing values as N/A or Unavailable', () => {
    expect(formatRating(null)).toBe('N/A');
    expect(formatRating(2318)).toBe('2,318');
    expect(formatEloChange(null)).toBe('N/A');
    expect(formatEloChange(18)).toBe('+18 Elo');
    expect(formatEloChange(-5)).toBe('-5 Elo');
    expect(formatUtc(null)).toBe('Unavailable');
  });

  it('signs numbers and reads time controls', () => {
    expect(signedNumber(0)).toBe('0');
    expect(formatUtc(0)).toContain('1970');
    expect(formatTimeControl('180+2')).toBeTruthy();
  });
});
