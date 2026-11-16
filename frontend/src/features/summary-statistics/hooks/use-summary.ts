import { useQuery } from '@tanstack/react-query';
import { getSummary } from '@/features/summary-statistics/api/get-summary';
import type { TimeClass, TimeFrame } from '@/types/chess';

export function useSummary(username: string, frame: TimeFrame, timeClass: TimeClass) {
  return useQuery({
    queryKey: ['summary', username, frame, timeClass],
    queryFn: () => getSummary(username, frame, timeClass),
  });
}
