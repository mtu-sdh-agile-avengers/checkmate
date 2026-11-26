import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchPanel } from '@/components/chess/match-panel';
import { Tabletop } from '@/components/chess/tabletop';
import { TopDownBoard } from '@/components/chess/top-down-board';
import { TopDownFigure } from '@/components/chess/top-down-figure';
import { ToastStack } from '@/components/ui/toast-stack';
import { ROUTES } from '@/config/routes';
import { DifficultyPanel } from '@/features/play-computer/components/difficulty-panel';
import { GameBoard } from '@/features/play-computer/components/game-board';
import { GameOverTv } from '@/features/play-computer/components/game-over-tv';
import { GameTv } from '@/features/play-computer/components/game-tv';
import { MoveList } from '@/features/play-computer/components/move-list';
import { DEFAULT_DIFFICULTY, difficultyName, type DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import { useArrival } from '@/features/play-computer/hooks/use-arrival';
import { useComputerGame } from '@/features/play-computer/hooks/use-computer-game';
import { replayMoves } from '@/features/play-computer/utils/board-replay';
import { explainIllegal } from '@/features/play-computer/utils/chess-rules';
import type { GameResult } from '@/features/play-computer/utils/game-result';
import { gameNote } from '@/features/play-computer/utils/game-note';
import { moveBetween, targetsFrom } from '@/features/play-computer/utils/moves';
import { useIntro } from '@/hooks/use-intro';
import { useToasts } from '@/hooks/use-toasts';
import { afterMotion } from '@/utils/motion';
import './play-computer.css';

/** Camera move (1.4s) and the panel sliding in after it (1.05s + .45s). */
const INTRO_MS = 1600;
/** The panel slides in after this when it comes back from the game. */
const RETURN_DELAY = '.12s';
/** The players walking in and sitting down when a game starts (play-computer.css). */
const WALK_MS = 2600;
/** The game-over set comes down once the last move has been seen to land. */
const RESULT_DELAY_MS = 700;

/**
 * In-Game Chess (player vs computer), at /play. The camera looks straight down at the board;
 * the side panel picks the computer's strength. "Start game" switches the panel to the game
 * (You as White, the computer as Black), the two players walk in and take their seats, and
 * the statistics TV comes on beside the board. The backend checks every move and plays the
 * computer (Stockfish), see use-computer-game.
 *
 * Playing: drag one of your pieces to its square, or click it, then where it goes (the board
 * is keyboard-playable the same way). Every move slides, the computer's too; the move list in
 * the panel follows the game. A refused move says why in a notification, and so does a king
 * coming into check (its square turns red while it lasts). When the game ends, the game-over
 * set comes down with the result: Play Again or Go Back.
 */
export function PlayComputerView({ leaving = false }: { leaving?: boolean }) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const levels = useRef<HTMLDivElement>(null);
  const intro = useIntro(root, INTRO_MS);
  const [level, setLevel] = useState<DifficultyId>(DEFAULT_DIFFICULTY);
  const [started, setStarted] = useState(false);
  const [returned, setReturned] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const computer = useComputerGame(level);
  const arrival = useArrival(started, WALK_MS);
  const toasts = useToasts();
  const { show: notify } = toasts;
  const toMenu = () => navigate(ROUTES.search);
  const game = computer.game;
  const playable = started && game !== null && game.status === 'playing' && !computer.repetition && !computer.thinking;

  // The pieces, each with its own id, after every move so far: the board slides them.
  const replay = useMemo(() => {
    try {
      return replayMoves(computer.moves);
    } catch {
      return null; // never with the server's moves; the board then simply shows the position
    }
  }, [computer.moves]);
  const lastUci = computer.moves.at(-1);
  const lastMove = lastUci ? { from: lastUci.slice(0, 2), to: lastUci.slice(2, 4) } : null;

  // Plays the move if the server allows it; if not, says why.
  const tryMove = (from: string, to: string): boolean => {
    const move = game ? moveBetween(game.legalMoves, from, to) : null;
    if (move) {
      setSelected(null);
      computer.play(move);
      return true;
    }
    if (computer.position) notify(explainIllegal(computer.position, from, to));
    return false;
  };

  // Click (or keyboard): one of your pieces, then one of its highlighted squares.
  const onSquare = (square: string) => {
    if (!playable) return;
    if (selected === square) {
      setSelected(null);
      return;
    }
    if (targetsFrom(game.legalMoves, square).length > 0) {
      setSelected(square); // one of your pieces (another one, if one was picked)
      return;
    }
    const own = computer.position?.board.get(square);
    if (own?.side === 'white') {
      notify(`That ${own.kind} can’t move right now.`);
      setSelected(null);
      return;
    }
    if (selected && !tryMove(selected, square)) setSelected(null);
  };
  // Drag: dropped back where it came from (or off the board), the piece just goes home.
  const onDrop = (from: string, to: string | null) => {
    if (to === null || to === from) return;
    if (!tryMove(from, to)) setSelected(null);
  };

  const newGame = () => {
    setSelected(null);
    computer.start();
  };
  // A click or a key press skips whatever entrance is playing; it still does what it does.
  const skip = () => {
    intro.skip();
    arrival.skip();
  };

  // A king coming into check: once per check, from the move that gave it.
  const checkKey = computer.check && !computer.over ? `${computer.moves.length}:${computer.check}` : null;
  const toldCheck = useRef<string | null>(null);
  useEffect(() => {
    if (!checkKey || checkKey === toldCheck.current) return;
    toldCheck.current = checkKey;
    notify(checkKey.endsWith('white') ? 'Check! Your king is in check.' : 'Check! The computer’s king is in check.', 'alert');
  }, [checkKey, notify]);

  // The game-over set: down once the last move has landed; Escape puts it away until the next game.
  const result = computer.result;
  const [shownResult, setShownResult] = useState<GameResult | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [lastResult, setLastResult] = useState<GameResult | null>(result);
  if (result !== lastResult) {
    setLastResult(result);
    setShownResult(null);
    setDismissed(false);
  }
  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(() => setShownResult(result), afterMotion(RESULT_DELAY_MS));
    return () => clearTimeout(timer);
  }, [result]);
  const gameOver = started && shownResult !== null && !dismissed;

  // Keyboard users land on the selected level once the panel is in.
  useEffect(() => {
    if (!intro.done || started) return;
    const timer = setTimeout(() => {
      levels.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    }, returned ? afterMotion(160) : 0);
    return () => clearTimeout(timer);
  }, [intro.done, started, returned]);

  const name = difficultyName(level);
  const boardLabel = started ? `Board for your game against the computer (${name})` : 'Chess board, starting position';
  return (
    <div
      ref={root}
      className="topdown-view play-computer"
      data-intro={intro.state}
      data-arrival={arrival.walking ? 'walking' : undefined}
      data-leaving={leaving || undefined}
      inert={leaving}
      onPointerDownCapture={skip}
      onKeyDownCapture={skip}
    >
      {/* Everything but the game-over set, which keeps the keyboard while it is up. */}
      <div className="play-computer__game" inert={gameOver || undefined}>
        <Tabletop
          mode="computer"
          leaving={leaving}
          near={started ? <span className="seat-walk"><TopDownFigure tone="ivory" hat /></span> : undefined}
          far={started ? <span className="seat-walk"><TopDownFigure tone="ink" face="AI" /></span> : undefined}
        >
          {started && game && replay ? (
            <GameBoard
              pieces={replay.pieces}
              takenAt={replay.takenAt}
              plies={computer.moves.length}
              label={boardLabel}
              legalMoves={playable ? game.legalMoves : []}
              playable={playable}
              selected={selected}
              lastMove={lastMove}
              checkSquare={computer.checkSquare}
              onSquare={onSquare}
              onPick={setSelected}
              onDrop={onDrop}
            />
          ) : (
            <TopDownBoard placement={started && game ? game.placement : undefined} label={boardLabel} />
          )}
        </Tabletop>
        {started ? (
          <>
            <MatchPanel
              eyebrow={`02 / In-Game Chess · ${name}`}
              title="Your game"
              seats={[
                { name: 'You', detail: 'White', color: 'white' },
                { name: 'Computer', detail: `${name} · Black`, color: 'black' },
              ]}
              note={gameNote(game, computer.thinking, computer.error, computer.repetition)}
              toMove={game && !computer.over ? (computer.pending ? 'black' : game.turn) : null}
              leaving={leaving}
              delay=".12s"
              actions={
                <>
                  {computer.error && (
                    // The engine was busy or down, or the server out of reach: send the same request again.
                    <button type="button" className="panel-button" onClick={computer.retry}>Try again</button>
                  )}
                  <button type="button" className="panel-button panel-button--ghost" onClick={newGame}>
                    New game
                  </button>
                  <button type="button" className="panel-button panel-button--ghost" onClick={() => { setStarted(false); setReturned(true); setSelected(null); }}>
                    Change difficulty
                  </button>
                  <button type="button" className="panel-button" onClick={toMenu}>Back to menu</button>
                </>
              }
            >
              <MoveList moves={computer.history} pending={computer.pending !== null} />
            </MatchPanel>
            <GameTv fen={computer.fen} history={computer.history} startedAt={computer.startedAt} over={computer.over} leaving={leaving} />
          </>
        ) : (
          <DifficultyPanel
            value={level}
            onChange={setLevel}
            onStart={() => { setStarted(true); newGame(); }}
            onBack={toMenu}
            leaving={leaving}
            delay={returned ? RETURN_DELAY : undefined}
            groupRef={levels}
          />
        )}
      </div>
      {gameOver && (
        <GameOverTv
          result={shownResult}
          level={name}
          onPlayAgain={newGame}
          onGoBack={toMenu}
          onClose={() => setDismissed(true)}
          leaving={leaving}
        />
      )}
      <ToastStack toasts={toasts.toasts} label="Game notifications" leaving={leaving} />
    </div>
  );
}
