import type { GameHistoryDto } from '@/features/game-history/api/get-game-history';

// Our API response for hikaru, October 2026, blitz, 2 games per page (values from the real
// Chess.com snapshot used by the backend tests: 8 blitz games on 31 Oct 2026).
export const HIKARU_BLITZ_PAGE: GameHistoryDto = {
  year: 2026,
  month: 10,
  items: [
    {
      id: '186299800014',
      url: 'https://www.chess.com/game/live/186299800014',
      timeClass: 'blitz',
      timeControl: '180',
      endTime: '2026-10-31T19:39:20Z',
      rated: true,
      rules: 'chess',
      color: 'white',
      result: 'win',
      player: { username: 'Hikaru', rating: 3453 },
      opponent: { username: 'Sina-Movahed', rating: 3299 },
      avgRating: 3376,
    },
    {
      id: '186299623076',
      url: 'https://www.chess.com/game/live/186299623076',
      timeClass: 'blitz',
      timeControl: '180',
      endTime: '2026-10-31T19:32:54Z',
      rated: true,
      rules: 'chess',
      color: 'black',
      result: 'win',
      player: { username: 'Hikaru', rating: 3448 },
      opponent: { username: 'Sina-Movahed', rating: 3304 },
      avgRating: 3376,
    },
  ],
  pagingLimit: 2,
  totalGames: 8,
  totalPages: 4,
  page: 1,
  hasNext: true,
};
