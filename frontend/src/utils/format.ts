export const formatNumber = (value: number): string => new Intl.NumberFormat('en-IE').format(value);

export const signedNumber = (value: number): string => `${value > 0 ? '+' : ''}${value}`;

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
