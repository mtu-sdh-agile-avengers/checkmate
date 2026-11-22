import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MatchPanel } from '@/components/chess/match-panel';
import { Tabletop } from '@/components/chess/tabletop';
import { TopDownBoard } from '@/components/chess/top-down-board';
import { ROUTES } from '@/config/routes';
import { DifficultyPanel } from '@/features/play-computer/components/difficulty-panel';
import { DEFAULT_DIFFICULTY, difficultyName, type DifficultyId } from '@/features/play-computer/config/difficulty-levels';
import { useIntro } from '@/hooks/use-intro';
import { afterMotion } from '@/utils/motion';

/** Camera move (1.4s) and the panel sliding in after it (1.05s + .45s). */
const INTRO_MS = 1600;
/** The panel slides in after this when it comes back from the game. */
const RETURN_DELAY = '.12s';

/**
 * In-Game Chess (player vs computer), at /play. The camera looks straight down at the board;
 * the side panel picks the computer's strength. "Start game" switches the panel to the game
 * (You as White, the computer as Black) — for now the board is a preview, as the game engine
 * is still to be built.
 */
export function PlayComputerView({ leaving = false }: { leaving?: boolean }) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const levels = useRef<HTMLDivElement>(null);
  const intro = useIntro(root, INTRO_MS);
  const [level, setLevel] = useState<DifficultyId>(DEFAULT_DIFFICULTY);
  const [started, setStarted] = useState(false);
  const [returned, setReturned] = useState(false);
  const toMenu = () => navigate(ROUTES.search);

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
        {/* TODO(engine): the board is a preview. Once the engine exists, start a game at `level`
            from "Start game" and pass the position here as a FEN placement (`placement`). */}
        <TopDownBoard label={started ? `Board for your game against the computer (${name}), starting position` : 'Chess board, starting position'} />
      </Tabletop>
      {started ? (
        <MatchPanel
          eyebrow={`02 / In-Game Chess · ${name}`}
          title="Your game"
          seats={[
            { name: 'You', detail: 'White', color: 'white' },
            { name: 'Computer', detail: `${name} · Black`, color: 'black' },
          ]}
          note="Board preview: moves will work once the game engine is connected."
          leaving={leaving}
          delay=".12s"
          actions={
            <>
              <button type="button" className="panel-button panel-button--ghost" onClick={() => { setStarted(false); setReturned(true); }}>
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
          onStart={() => setStarted(true)}
          onBack={toMenu}
          leaving={leaving}
          delay={returned ? RETURN_DELAY : undefined}
          groupRef={levels}
        />
      )}
    </div>
  );
}
