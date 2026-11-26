import { describe, expect, it } from 'vitest';
import { compareMonths, nextMonth, previousMonth, sameMonth } from './months';

describe('months', () => {
  it('steps over the turn of the year', () => {
    expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 });
    expect(previousMonth({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 4 });
    expect(nextMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
    expect(nextMonth({ year: 2026, month: 5 })).toEqual({ year: 2026, month: 6 });
  });

  it('compares months', () => {
    expect(compareMonths({ year: 2026, month: 1 }, { year: 2025, month: 11 })).toBe(2);
    expect(sameMonth({ year: 2026, month: 1 }, { year: 2026, month: 1 })).toBe(true);
    expect(sameMonth(null, { year: 2026, month: 1 })).toBe(false);
  });
});
