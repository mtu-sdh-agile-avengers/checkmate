import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { playComputerMove, type ComputerGameState } from '@/features/play-computer/api/play-move';
import type { DifficultyId } from '@/features/play-computer/config/difficulty-levels';

/**
 * A game against the computer (the player is White). `start()` sets up a new game, `play(uci)`
 * sends a move; the state comes back from the server after the computer's reply.
 * `history` is every move so far in SAN, e.g. ["e4", "e5", "Nf3"].
 */
export function useComputerGame(level: DifficultyId) {
  const [game, setGame] = useState<ComputerGameState | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: playComputerMove,
    onSuccess: (state) => {
      setGame(state);
      const sans = [state.playerMove?.san, state.computerMove?.san].filter((san): san is string =>
        Boolean(san),
      );
      setHistory((moves) => [...moves, ...sans]);
    },
  });

  return {
    game,
    history,
    thinking: mutation.isPending,
    error: mutation.error,
    start: () => {
      setGame(null);
      setHistory([]);
      mutation.reset();
      mutation.mutate({ level });
    },
    play: (move: string) => {
      if (game && !mutation.isPending) mutation.mutate({ fen: game.fen, move, level });
    },
  };
}
