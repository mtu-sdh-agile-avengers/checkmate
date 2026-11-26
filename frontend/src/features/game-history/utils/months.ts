import type { GameArchive } from '@/types/chess';

/** How many months `a` is after `b` (negative when it is before). */
export const compareMonths = (a: GameArchive, b: GameArchive): number =>
  (a.year - b.year) * 12 + (a.month - b.month);

export const sameMonth = (a?: GameArchive | null, b?: GameArchive | null): boolean =>
  a?.year === b?.year && a?.month === b?.month;

export const previousMonth = ({ year, month }: GameArchive): GameArchive =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

export const nextMonth = ({ year, month }: GameArchive): GameArchive =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
