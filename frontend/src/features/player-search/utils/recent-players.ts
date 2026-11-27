/** A player looked up before, offered again in the search's suggestions. */
export type RecentPlayer = { username: string; title: string | null; avatar: string | null };

export const RECENT_PLAYERS_KEY = 'checkmate:recent-players';
export const MAX_RECENT_PLAYERS = 5;

/** The players looked up last, most recent first; none where storage is unavailable. */
export function loadRecentPlayers(): RecentPlayer[] {
  try {
    const data: unknown = JSON.parse(window.localStorage.getItem(RECENT_PLAYERS_KEY) ?? '[]');
    if (!Array.isArray(data)) return [];
    return data.filter(isRecentPlayer).slice(0, MAX_RECENT_PLAYERS);
  } catch {
    return [];
  }
}

/** Puts `player` first (once), keeps the last few; returns the new list. */
export function rememberPlayer(player: RecentPlayer): RecentPlayer[] {
  const username = player.username.toLowerCase();
  const recent = [
    { username, title: player.title, avatar: player.avatar },
    ...loadRecentPlayers().filter((other) => other.username !== username),
  ].slice(0, MAX_RECENT_PLAYERS);
  try {
    window.localStorage.setItem(RECENT_PLAYERS_KEY, JSON.stringify(recent));
  } catch {
    // storage unavailable: remembered for this page only
  }
  return recent;
}

function isRecentPlayer(value: unknown): value is RecentPlayer {
  if (!value || typeof value !== 'object') return false;
  const { username, title, avatar } = value as Record<string, unknown>;
  return (
    typeof username === 'string' &&
    username.length > 0 &&
    (title === null || typeof title === 'string') &&
    (avatar === null || typeof avatar === 'string')
  );
}
