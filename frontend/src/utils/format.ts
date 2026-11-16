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
