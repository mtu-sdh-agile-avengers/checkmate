import { mockFindPlayer } from '@/lib/mock-api';
import type { Player } from '@/types/chess';

export function getPlayer(username: string): Promise<Player> {
  return mockFindPlayer(username);
}
