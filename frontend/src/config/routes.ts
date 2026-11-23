export const ROUTES = {
  search: '/',
  play: '/play',
  deliberation: '/deliberation',
  summary: (username: string) => `/players/${encodeURIComponent(username)}/summary`,
  overall: (username: string) => `/players/${encodeURIComponent(username)}/overall`,
  profile: (username: string) => `/players/${encodeURIComponent(username)}`,
} as const;
