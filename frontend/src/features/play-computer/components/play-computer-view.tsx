import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchPanel } from '@/components/chess/match-panel';
import { Tabletop } from '@/components/chess/tabletop';
import { TopDownBoard } from '@/components/chess/top-down-board';
import { ROUTES } from '@/config/routes';
import { DifficultyPanel } from '@/features/play-computer/components/difficulty-panel';
import { DEFAULT_DIFFICULTY, difficultyName, type DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import { useComputerGame } from '@/features/play-computer/hooks/use-computer-game';
import { gameNote } from '@/features/play-computer/utils/game-note';
import { moveBetween, targetsFrom } from '@/features/play-computer/utils/moves';
import { useIntro } from '@/hooks/use-intro';
import { afterMotion } from '@/utils/motion';

/** Camera move (1.4s) and the panel sliding in after it (1.05s + .45s). */
const INTRO_MS = 1600;
/** The panel slides in after this when it comes back from the game. */
const RETURN_DELAY = '.12s';

/**
 * In-Game Chess (player vs computer), at /play. The camera looks straight down at the board;
 * the side panel picks the computer's strength. "Start game" switches the panel to the game
 * (You as White, the computer as Black): click one of your pieces, then where it should go.
 * The backend checks every move and plays the computer (Stockfish), see use-computer-game.
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
  const toMenu = () => navigate(ROUTES.search);
  const game = computer.game;
  const playable = started && game !== null && game.status === 'playing' && !computer.thinking;

  // Pick up one of your pieces, then put it on one of its highlighted squares.
  const onSquare = (square: string) => {
    if (!playable) return;
    const move = selected ? moveBetween(game.legalMoves, selected, square) : null;
    if (move) {
      setSelected(null);
      computer.play(move);
      return;
    }
    setSelected(targetsFrom(game.legalMoves, square).length > 0 ? square : null);
  };
  const newGame = () => {
    setSelected(null);
    computer.start();
  };

  // Keyboard users land on the selected level once the panel is in.
  useEffect(() => {
    if (!intro.done || started) return;
    const timer = setTimeout(() => {
      levels.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    }, returned ? afterMotion(160) : 0);
    return () => clearTimeout(timer);
  }, [intro.done, started, returned]);

  const name = difficultyName(level);
  return (
    <div
      ref={root}
      className="topdown-view play-computer"
      data-intro={intro.state}
      data-leaving={leaving || undefined}
      inert={leaving}
      onPointerDownCapture={intro.skip}
      onKeyDownCapture={intro.skip}
    >
      <Tabletop mode="computer" leaving={leaving}>
        <TopDownBoard
          placement={started && game ? game.placement : undefined}
          label={started ? `Board for your game against the computer (${name})` : 'Chess board, starting position'}
          interaction={started && game ? {
            onSquare,
            selected,
            targets: selected ? targetsFrom(game.legalMoves, selected) : [],
            lastMove: game.lastMove,
          } : undefined}
        />
      </Tabletop>
      {started ? (
        <MatchPanel
          eyebrow={`02 / In-Game Chess · ${name}`}
          title="Your game"
          seats={[
            { name: 'You', detail: 'White', color: 'white' },
            { name: 'Computer', detail: `${name} · Black`, color: 'black' },
          ]}
          note={gameNote(game, computer.thinking, computer.error)}
          toMove={game?.status === 'playing' ? game.turn : null}
          leaving={leaving}
          delay=".12s"
          actions={
            <>
              <button type="button" className="panel-button panel-button--ghost" onClick={newGame}>
                New game
              </button>
              <button type="button" className="panel-button panel-button--ghost" onClick={() => { setStarted(false); setReturned(true); setSelected(null); }}>
                Change difficulty
              </button>
              <button type="button" className="panel-button" onClick={toMenu}>Back to menu</button>
            </>
          }
        />
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
  );
}
