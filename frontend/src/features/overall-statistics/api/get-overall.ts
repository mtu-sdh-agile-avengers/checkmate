import { mockGetOverall } from '@/lib/mock-api';
import type { OverallStats } from '@/types/chess';

export function getOverall(username: string): Promise<OverallStats> {
  return mockGetOverall(username);
}
