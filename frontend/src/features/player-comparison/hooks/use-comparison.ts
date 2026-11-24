import { useQuery } from '@tanstack/react-query';
import { comparePlayers } from '@/features/player-comparison/api/compare-players';
import { ValidationError } from '@/lib/errors';
import type { TimeClass } from '@/types/chess';

/** What the visitor asked to compare; null until the Compare button is pressed. */
export type ComparisonRequest = { player1: string; player2: string; timeClass: TimeClass };

/**
 * The comparison for the comparison page (CMG4-59 / CMG4-60). Nothing is loaded while
 * `request` is null, so the page can show the empty form first.
 *
 * Invalid input fails at once without a retry (`ValidationError`); to show it before any
 * loading state, the form can also call `checkPlayers` on submit before `setRequest`.
 */
export function useComparison(request: ComparisonRequest | null) {
  return useQuery({
    queryKey: ['comparison', request?.player1, request?.player2, request?.timeClass],
    queryFn: () =>
      request
        ? comparePlayers(request.player1, request.player2, request.timeClass)
        : Promise.reject(new ValidationError('Choose two players to compare.')),
    enabled: request !== null,
  });
}
