// Chess.com codes that are not ISO country codes
const CHESSCOM_REGIONS: Record<string, string> = {
  XE: 'England',
  XS: 'Scotland',
  XW: 'Wales',
  XX: 'International',
};

/** Turns a Chess.com country URL into a label: ".../country/US" -> "United States (US)". */
export function countryLabel(countryUrl: string | null | undefined): string | null {
  const code = countryUrl?.split('/').filter(Boolean).pop()?.toUpperCase();
  if (!code) return null;

  let name = CHESSCOM_REGIONS[code];
  if (!name) {
    try {
      name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
    } catch {
      // not a valid region code: show the code only
    }
  }
  return name && name !== code ? `${name} (${code})` : code;
}
