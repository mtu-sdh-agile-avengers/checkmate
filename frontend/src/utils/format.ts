export const formatNumber = (value: number): string => new Intl.NumberFormat('en-IE').format(value);

export const signedNumber = (value: number): string => `${value > 0 ? '+' : ''}${value}`;

/** A rating, or "N/A" when there is none. */
export const formatRating = (value: number | null): string =>
  value === null ? 'N/A' : formatNumber(value);

/** A signed Elo difference ("+18 Elo"), or "N/A" when there is none. */
export const formatEloChange = (value: number | null): string =>
  value === null ? 'N/A' : `${signedNumber(value)} Elo`;

/** A calendar day in UTC, e.g. "Nov 3, 2026". */
export const formatDay = (date: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);

export const formatUtc = (timestamp: number | null): string =>
  timestamp === null
    ? 'Unavailable'
    : new Intl.DateTimeFormat('en-IE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        hour12: false,
      }).format(timestamp * 1000) + ' UTC';

const DAY_SECONDS = 24 * 60 * 60;

/**
 * A Chess.com time control in words: "180+2" -> "3 min + 2 s", "30" -> "30 s",
 * daily "1/86400" -> "1 day / move". Unknown formats are returned unchanged.
 */
export function formatTimeControl(timeControl: string): string {
  const daily = /^1\/(\d+)$/.exec(timeControl);
  if (daily) {
    const days = Number(daily[1]) / DAY_SECONDS;
    if (!Number.isInteger(days)) return `${Math.round(days * 24)} h / move`;
    return `${days} ${days === 1 ? 'day' : 'days'} / move`;
  }

  const live = /^(\d+)(?:\+(\d+))?$/.exec(timeControl);
  if (!live) return timeControl;
  const base = Number(live[1]);
  const increment = Number(live[2] ?? 0);
  const baseLabel = base % 60 === 0 ? `${base / 60} min` : `${base} s`;
  return increment > 0 ? `${baseLabel} + ${increment} s` : baseLabel;
}
