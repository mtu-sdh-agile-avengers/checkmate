export const ROUTES = {
  search: '/',
  play: '/play',
  /** The review of the last game finished against the computer (same view as `play`). */
  review: '/play/review',
  deliberation: '/deliberation',
  summary: (username: string) => `/players/${encodeURIComponent(username)}/summary`,
  overall: (username: string) => `/players/${encodeURIComponent(username)}/overall`,
  profile: (username: string) => `/players/${encodeURIComponent(username)}`,
} as const;
