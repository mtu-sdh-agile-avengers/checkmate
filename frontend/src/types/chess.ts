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

export type OverallStats = {
  from: string;
  to: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  peakRating: number;
  peakDate: string;
  averageOpponent: number;
  ratingHistory: RatingPoint[];
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
