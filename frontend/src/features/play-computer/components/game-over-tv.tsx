import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { GameResult } from '@/features/play-computer/utils/game-result';
import { useFocusOnArrival } from '@/hooks/use-focus-on-arrival';
import './game-tv.css';
import './game-over-tv.css';

/**
 * The end of a game: a television of the same make as the statistics set, lowered on its
 * cables over the dimmed table, with the result ("You Win", "You Lose" or "Draw"), how
 * ("by checkmate", "by stalemate", ...) and two ways on: Play Again (a new game at the same
 * level) and Go Back (to the main menu).
 *
 * A modal dialog: focus goes to Play Again when it arrives and stays inside (Tab and
 * Shift+Tab go round its two buttons, and focus that strays outside is brought back);
 * Escape dismisses it to look at the final position (`onClose`), handing focus back to where
 * it was. The view behind it is inert meanwhile (play-computer-view.tsx).
 */
export function GameOverTv({ result, level, onPlayAgain, onGoBack, onClose, leaving = false }: {
  result: GameResult;
  level: string;
  onPlayAgain: () => void;
  onGoBack: () => void;
  onClose: () => void;
  leaving?: boolean;
}) {
  const titleId = useId();
  const reasonId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const playAgain = useRef<HTMLButtonElement>(null);
  // Where focus was before the set came down (read on the first render, before it takes focus),
  // to hand it back when the set goes away.
  const [returnTo] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
  useEffect(() => () => returnTo?.focus({ preventScroll: true }), [returnTo]);
  useFocusOnArrival(playAgain, !leaving);

  // Focus that leaves the set (a click elsewhere, a screen reader) is brought back.
  useEffect(() => {
    if (leaving) return;
    const keepInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) playAgain.current?.focus({ preventScroll: true });
    };
    document.addEventListener('focusin', keepInside);
    return () => document.removeEventListener('focusin', keepInside);
  }, [leaving]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const first = buttons[0];
    const last = buttons.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="game-over" data-outcome={result.outcome} data-leaving={leaving || undefined}>
      {/* A press on the dimmed table keeps focus in the set. */}
      <div className="game-over__backdrop" aria-hidden="true" onMouseDown={(event) => event.preventDefault()} />
      <div
        ref={dialog}
        className="game-over__rig"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={reasonId}
        onKeyDown={onKeyDown}
      >
        <div className="game-tv__cabinet game-over__cabinet">
          <div className="game-tv__screen game-over__screen">
            <div className="game-over__picture">
              <span className="game-tv__channel">CH 2 · FINAL</span>
              <h2 id={titleId} className="game-over__title">{result.title}</h2>
              <p id={reasonId} className="game-over__reason">{result.reason}</p>
              <div className="game-over__actions">
                <button
                  ref={playAgain}
                  type="button"
                  className="panel-button"
                  onClick={onPlayAgain}
                  aria-label={`Play Again: a new game against the computer (${level})`}
                >
                  Play Again
                </button>
                <button type="button" className="panel-button panel-button--ghost" onClick={onGoBack} aria-label="Go Back to the main menu">
                  Go Back
                </button>
              </div>
            </div>
            <i className="game-tv__glass" aria-hidden="true" />
          </div>
          <div className="game-tv__controls" aria-hidden="true">
            <span className="game-tv__grille" />
            <span className="game-tv__knobs"><i /><i /></span>
          </div>
        </div>
      </div>
    </div>
  );
}
