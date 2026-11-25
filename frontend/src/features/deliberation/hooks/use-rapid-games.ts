import { useEffect, useState } from 'react';
import { playMove, RAPID_GAMES, startingPieces, type BoardPiece, type PlayedMove } from '@/features/deliberation/utils/rapid-games';

type Table = {
  pieces: BoardPiece[];
  game: number; // which of RAPID_GAMES is on the board
  ply: number; // moves played in it; past its end the final position holds, then the pieces go home
  move: PlayedMove | null; // the last move, for the hop, the capture and the player's reach
  moves: number; // moves played in all, so every move can restart its animations
};

/** After a game's last move, its final position holds for this many moves, then the pieces go home. */
const HOLD_PLIES = 2;

const fresh = (game: number): Table => ({ pieces: startingPieces(), game, ply: 0, move: null, moves: 0 });

function advance(table: Table): Table {
  const moves = RAPID_GAMES[table.game] ?? [];
  if (table.ply < moves.length) {
    const played = playMove(table.pieces, moves[table.ply] ?? '');
    return { ...table, pieces: played.pieces, ply: table.ply + 1, move: played.move, moves: table.moves + 1 };
  }
  if (table.ply < moves.length + HOLD_PLIES) return { ...table, ply: table.ply + 1, move: null };
  // Game over: every piece slides home and the next game starts.
  return { ...fresh((table.game + 1) % RAPID_GAMES.length), moves: table.moves };
}

/**
 * The games played at the Deliberation table while the players are compared: one short real
 * game after another (`RAPID_GAMES`), a move every `plyMs`. When `playing` stops, the board
 * freezes where it is (the beat before the verdict); when it starts again, the pieces go home
 * and the next game begins. `still` (reduced motion) plays nothing.
 */
export function useRapidGames(playing: boolean, plyMs: number, still: boolean) {
  const [table, setTable] = useState<Table>(() => fresh(0));
  const [wasPlaying, setWasPlaying] = useState(playing);
  if (playing !== wasPlaying) {
    setWasPlaying(playing);
    if (playing && table.ply > 0) setTable((current) => ({ ...fresh((current.game + 1) % RAPID_GAMES.length), moves: current.moves }));
  }

  useEffect(() => {
    if (!playing || still) return;
    const timer = setInterval(() => setTable(advance), plyMs);
    return () => clearInterval(timer);
  }, [playing, plyMs, still]);

  return table;
}
