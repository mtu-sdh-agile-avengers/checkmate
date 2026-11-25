import { describe, expect, it } from 'vitest';
import { countryLabel } from './country';

describe('countryLabel', () => {
  it('names ISO countries and Chess.com regions', () => {
    expect(countryLabel('https://api.chess.com/pub/country/US')).toBe('United States (US)');
    expect(countryLabel('https://api.chess.com/pub/country/XE')).toBe('England (XE)');
  });

  it('falls back to the code, or nothing', () => {
    expect(countryLabel('https://api.chess.com/pub/country/1')).toBe('1');
    expect(countryLabel('https://api.chess.com/pub/country/XY')).toBe('XY'); // no name known
    expect(countryLabel(null)).toBeNull();
    expect(countryLabel('')).toBeNull();
  });
});
