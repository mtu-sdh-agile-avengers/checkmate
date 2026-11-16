export const APP_NAME = 'CHECKMATE';
export const DEMO_USERNAME = 'hikaru';
export const MOCK_DELAY_MS = 260;
export const TIME_FRAMES = [
  { value: '7', label: '7 days' },
  { value: '15', label: '15 days' },
  { value: '30', label: '30 days' },
  { value: 'all', label: 'All' },
] as const;
export const TIME_CLASSES = [
  { value: 'bullet', label: 'Bullet' },
  { value: 'blitz', label: 'Blitz' },
  { value: 'rapid', label: 'Rapid' },
  { value: 'daily', label: 'Daily' },
] as const;
