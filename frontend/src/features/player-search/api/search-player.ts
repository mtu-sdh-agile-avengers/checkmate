import { mockFindPlayer } from '@/lib/mock-api';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';
import type { Player } from '@/types/chess';

export async function searchPlayer(input: string): Promise<Player> {
  const username = parseChessUsername(input);
  return mockFindPlayer(username);
}
