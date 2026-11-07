import { mockGetSummary } from '@/lib/mock-api';
import type { SummaryStats, TimeClass, TimeFrame } from '@/types/chess';

export function getSummary(username: string, timeFrame: TimeFrame, timeClass: TimeClass): Promise<SummaryStats> {
  return mockGetSummary(username, timeFrame, timeClass);
}
