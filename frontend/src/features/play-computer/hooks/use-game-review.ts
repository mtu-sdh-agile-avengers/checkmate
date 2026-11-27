import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { getApiMode } from '@/config/api';
import { analyseComputerGame } from '@/features/play-computer/api/analyse-game';
import { replayMoves } from '@/features/play-computer/utils/board-replay';
import { chancesOf, countMarks, markOf, pivotalMoments } from '@/features/play-computer/utils/review';
import { saveAnalysis, type SavedGame } from '@/features/play-computer/utils/saved-game';
import { shouldRetry } from '@/lib/query-client';
import { moveSoundKind, playMoveSound, unlockAudio } from '@/lib/sound';

/** Keys that step through the game, and where each goes from `ply` (of `total`). */
const STEPS: Record<string, (ply: number, total: number) => number> = {
  ArrowLeft: (ply) => ply - 1,
  ArrowRight: (ply) => ply + 1,
  Home: () => 0,
  End: (_ply, total) => total,
};

/**
 * The review of a finished game (`game`, null when there is none): the engine's analysis of
 * every move, loaded once and kept with the game (saved-game.ts), and the position being looked
 * at, `ply` (0 is the start, `total` the final position, where the review opens).
 *
 * `goTo(ply)` shows another position, with a click of a piece being set down; while `active`,
 * ← and → step back and forward and Home and End go to the start and the end (not while
 * typing in a field). The analysis gives every position its evaluation, flags blunders,
 * mistakes and inaccuracies, and finds the moments that turned the game (utils/review.ts).
 */
export function useGameReview(game: SavedGame | null, active: boolean) {
  const total = game?.moves.length ?? 0;
  const analysis = useQuery({
    queryKey: ['computer-game-analysis', game?.id ?? null, total],
    queryFn: async () => {
      const result = await analyseComputerGame(game?.moves ?? []);
      if (game) saveAnalysis(game.id, result); // a reload of the review needs no new request
      return result;
    },
    enabled: active && game !== null && total > 0 && !game.analysis,
    initialData: game?.analysis,
    staleTime: Infinity,
    // Without the backend (mock mode) another try cannot help.
    retry: (failures, error) => getApiMode() === 'live' && shouldRetry(failures, error),
  });

  // A different game opens at its final position, where the game was left.
  const [ply, setPly] = useState(total);
  const [shownGame, setShownGame] = useState(game?.id ?? null);
  if ((game?.id ?? null) !== shownGame) {
    setShownGame(game?.id ?? null);
    setPly(total);
  }

  const goTo = (target: number) => {
    const next = Math.max(0, Math.min(total, target));
    if (next === ply) return;
    setPly(next);
    // Called from a click or a key press, so the audio may start here (autoplay rules).
    unlockAudio();
    playMoveSound(next === ply + 1 ? moveSoundKind(game?.history[next - 1]) : 'move');
  };

  useEffect(() => {
    if (!active || total === 0) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const step = STEPS[event.key];
      if (!step || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      goTo(step(ply, total));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const moves = analysis.data?.moves ?? null;
  const summary = useMemo(() => {
    if (!moves) return null;
    return {
      chances: chancesOf(moves),
      marks: moves.map((move) => markOf(move.category)),
      counts: countMarks(moves),
      moments: pivotalMoments(moves),
    };
  }, [moves]);
  const replay = useMemo(() => {
    try {
      return replayMoves(game?.moves.slice(0, ply) ?? []);
    } catch {
      return null; // moves that do not play (edited storage): the board shows no pieces moving
    }
  }, [game, ply]);

  return {
    total,
    ply,
    goTo,
    /** The pieces in the position looked at, for the board (each keeps its id, so steps slide). */
    replay,
    /** The engine's analysis, once it has arrived. */
    analysis: analysis.data ?? null,
    loading: analysis.isPending && analysis.fetchStatus !== 'idle',
    error: analysis.error,
    retry: () => void analysis.refetch(),
    /** The evaluation of the move that led to the position looked at (null at the start). */
    current: ply > 0 ? (moves?.[ply - 1] ?? null) : null,
    /** White's chances in every position, the flag of every move, the flags each side got and
     *  the turning points; null until the analysis has arrived. */
    summary,
  };
}

export type GameReview = ReturnType<typeof useGameReview>;
