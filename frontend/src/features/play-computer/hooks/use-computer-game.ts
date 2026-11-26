import { useMutation } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { playComputerMove, type ComputerGameState, type PlayMoveInput } from '@/features/play-computer/api/play-move';
import type { DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import { applyUci, inCheck, kingSquare, parseFen, sanFor, toFen } from '@/features/play-computer/utils/chess-rules';
import { readResult } from '@/features/play-computer/utils/game-result';
import { positionKey } from '@/features/play-computer/utils/game-stats';
import { afterMotion } from '@/utils/motion';

/** A move slides for 0.3s (game-board.css): the computer's reply is never shown sooner than
 *  this after the player's move, so the two never slide at the same time. */
export const MOVE_SLIDE_MS = 320;

/** A request to the server, tagged with the game (`round`) it belongs to. */
type MoveRequest = PlayMoveInput & { round: number };

const pause = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * A game against the computer (the player is White). `start()` sets up a new game, `play(uci)`
 * sends a move; the server checks it, plays the computer's reply and sends the new position.
 *
 * The player's move shows at once: while the server answers it is `pending`, and `fen`,
 * `moves` and `history` already include it (the server's own notation replaces it with the
 * reply). If the request fails, the move is taken back. The rules on the page
 * (utils/chess-rules.ts) only draw that position; what is legal is the server's to say.
 * - `moves` is every move in coordinate notation (for the sliding pieces), `history` the same
 *   in SAN, e.g. ["e4", "e5", "Nf3"];
 * - `check` is the side whose king is in check in the position shown, `checkSquare` its king;
 * - `repetition`: the server sees one position at a time, so threefold repetition is counted
 *   here, over every position of the game: the server's (after the computer's reply, White to
 *   move) and the one after each of the player's moves (Black to move), built on the page. A
 *   cycle can repeat on either side: the computer may answer one position differently each
 *   time. The game is then drawn and no more moves are sent; when the player's move is the one
 *   that brings a position back the third time, the game ends there, and the computer's reply
 *   (the server has played it already) is never shown;
 * - `result` says how the game ended (you win, you lose or a draw, and why), null until then;
 * - `retry()` sends the last request again after it failed (the engine was busy or down, the
 *   server unreachable), whether that was starting the game or a move;
 * - `startedAt`, for the clock on the statistics TV.
 */
export function useComputerGame(level: DifficultyId) {
  const [game, setGame] = useState<ComputerGameState | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  // How many times each position has come up (positionKey), and whether one has come up thrice.
  const seen = useRef(new Map<string, number>());
  const [repeated, setRepeated] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  // Every new game is a new round: a late answer to an earlier game is dropped.
  const round = useRef(0);
  /** Counts one more occurrence of a position; true at the third. */
  const thirdTime = (fen: string) => {
    const key = positionKey(fen);
    const times = (seen.current.get(key) ?? 0) + 1;
    seen.current.set(key, times);
    return times >= 3;
  };
  const mutation = useMutation({
    mutationFn: async (request: MoveRequest) => {
      const [state] = await Promise.all([
        playComputerMove(request),
        request.move ? pause(afterMotion(MOVE_SLIDE_MS)) : null,
      ]);
      return state;
    },
    onSuccess: (state, request) => {
      if (request.round !== round.current) return;
      setPending(null);
      // The position after the player's move (Black to move) counts too. Its FEN is built here,
      // so its en passant field can differ from python-chess's: only right after a double pawn
      // step, a position that cannot come up again, so the counts are not affected.
      const yours = state.playerMove;
      if (request.fen && request.move && yours) {
        const afterYours = applyUci(parseFen(request.fen), request.move);
        const fen = toFen(afterYours);
        if (thirdTime(fen)) {
          // Drawn by this very move: the game ends here, before the computer's reply.
          setGame({
            ...state,
            fen,
            placement: fen.split(' ')[0] ?? fen,
            computerMove: null,
            turn: 'black',
            legalMoves: [],
            check: inCheck(afterYours, 'black'),
            status: 'playing',
            winner: null,
            lastMove: { from: yours.fromSquare, to: yours.toSquare },
          });
          setHistory((list) => [...list, yours.san]);
          setMoves((list) => [...list, yours.uci]);
          setRepeated(true);
          return;
        }
      }
      setGame(state);
      const played = [state.playerMove, state.computerMove].filter((move) => move !== null);
      setHistory((list) => [...list, ...played.map((move) => move.san)]);
      setMoves((list) => [...list, ...played.map((move) => move.uci)]);
      if (thirdTime(state.fen)) setRepeated(true);
    },
    onError: (_error, request) => {
      if (request.round === round.current) setPending(null);
    },
  });

  const position = useMemo(() => (game ? parseFen(game.fen) : null), [game]);
  // The position shown: the server's, or after the player's move while it is being answered.
  const shown = useMemo(() => (position && pending ? applyUci(position, pending) : position), [position, pending]);
  const shownMoves = useMemo(() => (pending ? [...moves, pending] : moves), [moves, pending]);
  const shownHistory = useMemo(
    () => (position && pending && game ? [...history, sanFor(position, pending, game.legalMoves)] : history),
    [history, position, pending, game],
  );
  const check = pending ? (shown && inCheck(shown, shown.turn) ? shown.turn : null) : game?.check ? game.turn : null;
  const repetition = repeated && game !== null && game.status === 'playing';
  // The same object for as long as the game stays over, so the view can tell when it ends.
  const result = useMemo(() => readResult(game, repetition), [game, repetition]);

  return {
    game,
    /** The position shown, as a FEN. */
    fen: shown && pending ? toFen(shown) : (game?.fen ?? null),
    /** The position shown, for the rules on the page (null before the game is set up). */
    position: shown,
    moves: shownMoves,
    history: shownHistory,
    pending,
    check,
    checkSquare: check && shown ? kingSquare(shown.board, check) : null,
    thinking: mutation.isPending,
    error: mutation.error,
    repetition,
    result,
    /** The game has ended: checkmate, stalemate, a draw, or a draw by repetition. */
    over: result !== null,
    startedAt,
    start: () => {
      round.current += 1;
      setGame(null);
      setHistory([]);
      setMoves([]);
      setPending(null);
      seen.current = new Map();
      setRepeated(false);
      setStartedAt(Date.now());
      mutation.reset();
      mutation.mutate({ level, round: round.current });
    },
    play: (move: string) => {
      if (!game || mutation.isPending || repetition) return;
      setPending(move);
      mutation.mutate({ fen: game.fen, move, level, round: round.current });
    },
    retry: () => {
      const request = mutation.variables;
      if (!request || mutation.isPending) return;
      if (request.move) setPending(request.move);
      mutation.mutate(request);
    },
  };
}
