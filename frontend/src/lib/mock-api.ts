import { MOCK_DELAY_MS } from '@/config/constants';
import type {
  GameDetails,
  GameHistoryFilters,
  GameHistoryPage,
  GameListItem,
  GameResult,
  OverallStats,
  Player,
  PlayerComparison,
  RatingPoint,
  SummaryStats,
  TimeClass,
  TimeFrame,
} from '@/types/chess';
import { compareMetrics, type ComparedStats } from '@/utils/comparison';
import { formatDay, formatUtc } from '@/utils/format';

// Mock repository: all figures are fictional design fixtures, NOT live Chess.com records.
const currentUtc = 1793743200; // 2026-11-03 UTC; fixed for reproducible screenshots.
const historyOffsets = [0, 4, 6, 5, 10, 13, 11, 16, 19, 17, 21, 24, 27, 25, 31, 34, 33, 38, 41, 44, 42, 48, 52, 50, 56];

// A drawn stand-in for a profile picture, so the demo player shows how an avatar is used.
const DEMO_AVATAR = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#2c2b29"/><circle cx="48" cy="48" r="40" fill="#80796d"/><path d="M30 80 C26 56 33 40 50 30 L46 16 L60 26 C76 32 82 50 78 64 L68 70 L56 58 C52 64 56 72 66 80 Z" fill="#f7f6f3" stroke="#121213" stroke-width="3" stroke-linejoin="round"/><circle cx="62" cy="42" r="3.4" fill="#121213"/></svg>')}`;

async function mockDelay(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function ensureAvailable(username: string): void {
  if (username === 'notfound') throw new Error('This profile is not in the demo data. Try hikaru.');
  if (username === 'error') throw new Error('Demo service unavailable. Please retry.');
}

function makeHistory(endRating: number, frame: TimeFrame): RatingPoint[] {
  const total = frame === '7' ? 7 : frame === '15' ? 15 : frame === '30' ? 30 : 24;
  const start = frame === 'all' ? new Date('2023-01-12T12:00:00Z') : new Date('2026-11-03T12:00:00Z');
  if (frame !== 'all') start.setUTCDate(start.getUTCDate() - (total - 1));
  const spread = frame === 'all' ? 310 : 85;
  const endingWave = historyOffsets[(total - 1) % historyOffsets.length] ?? 0;
  return Array.from({ length: total }, (_, i) => {
    const date = new Date(start);
    if (frame === 'all') date.setUTCMonth(date.getUTCMonth() + i * 2);
    else date.setUTCDate(date.getUTCDate() + i);
    const offset = historyOffsets[i % historyOffsets.length] ?? 0;
    const fraction = i / Math.max(1, total - 1);
    const trend = endRating - spread + spread * fraction;
    return { date: date.toISOString().slice(0, 10), rating: Math.round(trend + offset - endingWave * fraction) };
  });
}

export async function mockFindPlayer(username: string): Promise<Player> {
  await mockDelay();
  ensureAvailable(username);
  return {
    id: '1029387',
    username,
    url: `https://www.chess.com/member/${encodeURIComponent(username)}`,
    avatar: username === 'hikaru' ? DEMO_AVATAR : null,
    title: username === 'hikaru' ? 'GM' : null,
    location: username === 'hikaru' ? 'Los Angeles, CA' : null,
    country: username === 'hikaru' ? 'United States (US)' : null,
    joined: 1263556800,
    lastOnline: 1793284200,
    followers: username === 'hikaru' ? 1245678 : 0,
    isStreamer: username === 'hikaru',
    twitchUrl: username === 'hikaru' ? 'https://www.twitch.tv/gmhikaru' : null,
    fide: username === 'hikaru' ? 2780 : null,
  };
}

export async function mockGetSummary(
  username: string,
  frame: TimeFrame,
  timeClass: TimeClass,
): Promise<SummaryStats> {
  await mockDelay();
  ensureAvailable(username);
  const frameScale: Record<TimeFrame, number> = { '7': 0.26, '15': 0.52, '30': 1, all: 10.6 };
  const classScale: Record<TimeClass, number> = { bullet: 1.25, blitz: 1, rapid: 0.78, daily: 0.18 };
  const games = Math.max(2, Math.round(60 * frameScale[frame] * classScale[timeClass]));
  const wins = Math.round(games * 0.55);
  const draws = Math.round(games * 0.1);
  const losses = games - wins - draws;
  const classOffset: Record<TimeClass, number> = { bullet: -70, blitz: 0, rapid: 35, daily: -120 };
  const actualRating = 1486 + classOffset[timeClass] + (frame === '7' ? -10 : frame === '15' ? -6 : 0);
  const expectedRating = actualRating - 14;
  return {
    timeFrame: frame,
    timeClass,
    from: frame === 'all' ? 'Jan 12, 2023' : frame === '30' ? 'Oct 5, 2026' : frame === '15' ? 'Oct 20, 2026' : 'Oct 28, 2026',
    to: 'Nov 3, 2026',
    games,
    wins,
    draws,
    losses,
    winRate: Math.round((wins / games) * 100),
    expectedRating,
    actualRating,
    difference: actualRating - expectedRating,
    lastChange: 8,
    ratingHistory: makeHistory(actualRating, frame),
  };
}

export async function mockGetOverall(username: string, timeClass: TimeClass = 'blitz'): Promise<OverallStats> {
  await mockDelay();
  ensureAvailable(username);
  // Blitz is the reference; the other classes scale it, like the summary demo data.
  const scale: Record<TimeClass, number> = { bullet: 1.25, blitz: 1, rapid: 0.78, daily: 0.18 };
  const offset: Record<TimeClass, number> = { bullet: -64, blitz: 0, rapid: 41, daily: -12 };
  const count = (value: number) => Math.round(value * scale[timeClass]);
  const [wins, draws, losses] = [count(682), count(134), count(424)];
  const games = wins + draws + losses;
  return {
    timeClass,
    from: 'Jan 12, 2023',
    to: 'Nov 3, 2026',
    games,
    wins,
    draws,
    losses,
    winRate: Math.round((wins / games) * 100),
    currentRating: 1548 + offset[timeClass],
    peakRating: 1562 + offset[timeClass],
    peakDate: 'Oct 28, 2026',
    averageOpponent: 1428 + offset[timeClass],
    ratingHistory: makeHistory(1548 + offset[timeClass], 'all'),
  };
}

// Demo game (same as the backend DEV mock): the "Opera game" (Morphy, 1858), 17 moves.
const MOCK_GAME_MOVES =
  '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 ' +
  '8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 ' +
  '14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0';
const MOCK_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MOCK_FINAL_FEN = '1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17';

export async function mockGetGame(
  username: string,
  gameId: string,
  archive?: { year: number; month: number },
): Promise<GameDetails> {
  await mockDelay();
  ensureAvailable(username);
  if (gameId === '0') throw new Error('This game is not in the demo data. Try any other game id.');
  // A game of the demo history list opens with that game's players, result and time control
  // (the moves are always the same demo game).
  const listed = archive ? mockMonthGames(username, archive).find((game) => game.id === gameId) : undefined;
  if (listed) {
    const [white, black] = listed.player.color === 'white' ? [listed.player, listed.opponent] : [listed.opponent, listed.player];
    return {
      id: listed.id,
      url: listed.url,
      timeClass: listed.timeClass,
      timeControl: listed.timeControl,
      endTime: listed.endTime,
      date: listed.date,
      rated: listed.rated,
      rules: listed.rules,
      result: listed.result,
      player: listed.player,
      opponent: listed.opponent,
      averageRating: listed.averageRating,
      pgn: `[White "${white.username}"]\n[Black "${black.username}"]\n\n${MOCK_GAME_MOVES}`,
      initialFen: MOCK_START_FEN,
      finalFen: MOCK_FINAL_FEN,
    };
  }
  const end = archive
    ? new Date(Date.UTC(archive.year, archive.month - 1, 15, 18, 30))
    : new Date('2026-11-03T18:30:00Z');
  return {
    id: gameId,
    url: `https://www.chess.com/game/live/${encodeURIComponent(gameId)}`,
    timeClass: 'blitz',
    timeControl: '3 min + 2 s',
    endTime: end.getTime() / 1000,
    date: formatDay(end),
    rated: true,
    rules: 'chess',
    result: 'win',
    player: { username, rating: 1512, color: 'white' },
    opponent: { username: 'mock_opponent', rating: 1488, color: 'black' },
    averageRating: 1500,
    pgn: `[White "${username}"]\n[Black "mock_opponent"]\n[Result "1-0"]\n\n${MOCK_GAME_MOVES}`,
    initialFen: MOCK_START_FEN,
    finalFen: MOCK_FINAL_FEN,
  };
}

/**
 * Demo comparison (same idea as the backend DEV mock): player 1 gets the demo all-time
 * statistics, player 2 the same with a 64-point lower rating, fewer wins and fewer losses,
 * so both players have fields where they are better. Usernames starting with "notfound"
 * are unavailable.
 */
export async function mockComparePlayers(
  p1: string,
  p2: string,
  timeClass: TimeClass,
): Promise<PlayerComparison> {
  const missing = [p1, p2].filter((username) => username.startsWith('notfound'));
  if (missing.length > 0) {
    await mockDelay();
    throw new Error(
      `${missing.length === 1 ? 'Player' : 'Players'} ${missing.join(', ')} data is unavailable`,
    );
  }
  // both lookups run, so the demo "error" username fails like a real lookup
  const [first] = await Promise.all([mockGetOverall(p1, timeClass), mockGetOverall(p2, timeClass)]);
  const toStats = (stats: OverallStats): ComparedStats => ({
    games: stats.games,
    wins: stats.wins,
    draws: stats.draws,
    losses: stats.losses,
    winRate: stats.winRate,
    currentRating: stats.currentRating,
    highestRating: stats.peakRating,
  });
  const player1 = toStats(first);
  const wins = first.wins - 60;
  const losses = first.losses - 30;
  const draws = first.draws + 10;
  const player2: ComparedStats = {
    games: wins + losses + draws,
    wins,
    draws,
    losses,
    winRate: Math.round((wins / (wins + losses + draws)) * 100),
    currentRating: (first.currentRating ?? 0) - 64,
    highestRating: (first.peakRating ?? 0) - 40,
  };
  const expected =
    1 / (1 + 10 ** (((player2.currentRating ?? 0) - (player1.currentRating ?? 0)) / 400));
  const percent = Math.round(expected * 1000) / 10;
  return {
    timeClass,
    player1: p1,
    player2: p2,
    metrics: compareMetrics(player1, player2),
    winLikelihood: { player1: percent, player2: Math.round((100 - percent) * 10) / 10 },
    winner: p1,
  };
}

// Demo game history (like the backend DEV mock): 60 games a month, one every 5 hours from the
// 1st of the month, cycling through time classes and results.
const HISTORY_CLASSES: TimeClass[] = ['blitz', 'bullet', 'rapid', 'blitz', 'daily', 'bullet'];
const HISTORY_RESULTS: GameResult[] = ['win', 'win', 'loss', 'draw', 'win', 'loss', 'loss'];
const HISTORY_TIME_CONTROLS: Record<TimeClass, string> = {
  bullet: '1 min',
  blitz: '3 min + 2 s',
  rapid: '10 min',
  daily: '1 day / move',
};
const HISTORY_GAMES_PER_MONTH = 60;

function mockMonthGames(
  username: string,
  archive: { year: number; month: number },
): GameListItem[] {
  const ratings: Record<TimeClass, number> = {
    bullet: 1450,
    blitz: 1520,
    rapid: 1580,
    daily: 1490,
  };
  const start = Date.UTC(archive.year, archive.month - 1, 1, 9, 0) / 1000;
  const prefix = `${archive.year}${String(archive.month).padStart(2, '0')}`;
  return Array.from({ length: HISTORY_GAMES_PER_MONTH }, (_, index) => {
    const timeClass = HISTORY_CLASSES[index % HISTORY_CLASSES.length] ?? 'blitz';
    const result = HISTORY_RESULTS[index % HISTORY_RESULTS.length] ?? 'win';
    ratings[timeClass] += result === 'win' ? 8 : result === 'loss' ? -8 : 0;
    const rating = ratings[timeClass];
    const opponentRating = rating + ((index * 37) % 120) - 60;
    const endTime = start + index * 5 * 60 * 60;
    const id = `${prefix}${String(index + 1).padStart(3, '0')}`;
    const white = index % 2 === 0;
    return {
      id,
      url: `https://www.chess.com/game/${timeClass === 'daily' ? 'daily' : 'live'}/${id}`,
      timeClass,
      timeControl: HISTORY_TIME_CONTROLS[timeClass],
      endTime,
      date: formatDay(new Date(endTime * 1000)),
      dateTime: formatUtc(endTime),
      rated: true,
      rules: 'chess',
      result,
      player: { username, rating, color: white ? 'white' : 'black' },
      opponent: {
        username: `mock_opponent_${(index % 5) + 1}`,
        rating: opponentRating,
        color: white ? 'black' : 'white',
      },
      averageRating: (rating + opponentRating) / 2,
      archive,
    };
  });
}

/** Demo game history list: filtered, sorted and paged like the real endpoint. */
export async function mockGetGameHistory(
  username: string,
  filters: GameHistoryFilters = {},
): Promise<GameHistoryPage> {
  await mockDelay();
  ensureAvailable(username);
  const pageSize = filters.pageSize ?? 50;
  const page = filters.page ?? 1;
  if (username === 'nogames') {
    return {
      archive: null,
      items: [],
      pageSize,
      totalGames: 0,
      totalPages: 0,
      page,
      hasNext: false,
    };
  }
  const archive = filters.archive ?? { year: 2026, month: 11 };
  const byClass = mockMonthGames(username, archive).filter(
    (game) => !filters.timeClass || game.timeClass === filters.timeClass,
  );
  const key = (game: GameListItem) =>
    filters.sortBy === 'avgRating' ? game.averageRating : game.endTime;
  const direction = filters.sortOrder === 'asc' ? 1 : -1;
  const sorted = [...byClass].sort(
    (a, b) => (key(a) - key(b) || a.endTime - b.endTime) * direction,
  );
  const totalPages = Math.ceil(sorted.length / pageSize);
  return {
    archive,
    items: sorted.slice((page - 1) * pageSize, page * pageSize),
    pageSize,
    totalGames: sorted.length,
    totalPages,
    page,
    hasNext: page < totalPages,
  };
}

// Static browser fixtures make it easy to replace the mock with a real API client later.
export const mockMetadata = { sample: true, asOf: currentUtc } as const;
