export type TimeFrame = '7' | '15' | '30' | 'all';
export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily';

export type Player = {
  id: string;
  username: string;
  url: string;
  avatar: string | null;
  title: string | null;
  location: string | null;
  country: string | null;
  joined: number;
  lastOnline: number | null;
  followers: number;
  isStreamer: boolean;
  twitchUrl: string | null;
  fide: number | null;
};

export type RatingPoint = { date: string; rating: number };

export type SummaryStats = {
  timeFrame: TimeFrame;
  timeClass: TimeClass;
  from: string;
  to: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  expectedRating: number | null; // null until the ML rating model exists (CMG4-11)
  actualRating: number | null; // null if the player never played this time class
  difference: number | null;
  lastChange: number | null; // rating change over the period; null for 'all' or no games
  ratingHistory: RatingPoint[];
};

/** All-time results in one time class. Chess.com keeps records per time class, so there is no
 *  combined total. Fields that the API does not provide (yet) are null; the page leaves them out. */
export type OverallStats = {
  timeClass: TimeClass;
  from: string | null; // first day covered; null when the record covers the whole account
  to: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number; // whole percent
  currentRating: number | null; // null if the player never played this time class
  peakRating: number | null;
  peakDate: string | null;
  averageOpponent: number | null;
  ratingHistory: RatingPoint[]; // empty when no history is available
};

export type PlayerColor = 'white' | 'black';
export type GameResult = 'win' | 'loss' | 'draw';

/** One side of a game; `rating` is the player's rating after the game. */
export type GamePlayer = { username: string; rating: number; color: PlayerColor };

/** One game for the game page (CMG4-17), seen by `player` (the player whose page it is). */
export type GameDetails = {
  id: string;
  url: string;
  timeClass: TimeClass;
  timeControl: string; // e.g. "3 min + 2 s", "1 day / move"
  endTime: number; // unix seconds (UTC)
  date: string; // e.g. "Oct 31, 2026"
  rated: boolean;
  rules: string; // "chess" for standard chess, otherwise the variant ("chess960", ...)
  result: GameResult; // result of `player`
  player: GamePlayer;
  opponent: GamePlayer;
  averageRating: number;
  pgn: string; // whole game in PGN (headers, moves and clock comments) for the replay
  initialFen: string;
  finalFen: string;
};

/** The two sides of a comparison (CMG4-15). */
export type ComparisonSide = 'player1' | 'player2';

/** One row of the comparison: the same statistic for both players. */
export type ComparisonMetric = {
  key: 'games' | 'wins' | 'draws' | 'losses' | 'winRate' | 'currentRating' | 'highestRating';
  label: string; // e.g. "Games played"
  player1: number | null; // null if the player has no value (e.g. no rating in this time class)
  player2: number | null;
  // Who is better in this row: highlight it green and the other one red; null = no highlight
  better: ComparisonSide | null;
};

/** Two players side by side in one time class, with all-time statistics (CMG4-15). */
export type PlayerComparison = {
  timeClass: TimeClass;
  player1: string; // username
  player2: string;
  metrics: ComparisonMetric[];
  // Expected score of each player in percent (one decimal); null without both ratings
  winLikelihood: { player1: number; player2: number } | null;
  winner: string | null; // username of the more likely winner; null if even or unknown
};
