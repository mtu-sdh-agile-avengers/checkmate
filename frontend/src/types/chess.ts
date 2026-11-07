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
  expectedRating: number;
  actualRating: number;
  difference: number;
  lastChange: number;
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
