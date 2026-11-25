import { useCallback, useMemo, useState } from 'react';
import { DeliberationView } from '@/features/deliberation/components/deliberation-view';
import type { ComparisonState } from '@/features/deliberation/types';
import { useComparison, type ComparisonRequest } from '@/features/player-comparison/hooks/use-comparison';
import { searchPlayer } from '@/features/player-search/api/search-player';
import type { TimeClass } from '@/types/chess';

/**
 * Deliberation as the stage shows it. Features never import each other, so the two that
 * Deliberation needs are joined here: the player search finds each player, and the player
 * comparison (`useComparison`, GET /players/compare) compares them once they are confirmed.
 * Deliberation only stages what the comparison reports.
 */
export function DeliberationScreen({ leaving = false }: { leaving?: boolean }) {
  const [request, setRequest] = useState<ComparisonRequest | null>(null);
  const query = useComparison(request);
  const { refetch } = query;
  const retry = useCallback(() => void refetch(), [refetch]);

  const comparison = useMemo<ComparisonState>(() => {
    if (!request) return { status: 'idle' };
    // Trying again after a failure fetches while the error is still the last result.
    if (query.status === 'pending' || query.fetchStatus === 'fetching') return { status: 'pending' };
    if (query.status === 'error') return { status: 'error', message: query.error.message, retry };
    return { status: 'success', comparison: query.data };
  }, [request, query.status, query.fetchStatus, query.error, query.data, retry]);

  const compare = useCallback((player1: string, player2: string, timeClass: TimeClass) => setRequest({ player1, player2, timeClass }), []);
  const reset = useCallback(() => setRequest(null), []);

  return <DeliberationView findPlayer={searchPlayer} comparison={comparison} onCompare={compare} onReset={reset} leaving={leaving} />;
}
