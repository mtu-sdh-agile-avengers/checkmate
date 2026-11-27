import { useEffect, useId, useRef, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { SidePanel } from '@/components/ui/side-panel';
import { SoundToggle } from '@/components/ui/sound-toggle';
import type { GameReview } from '@/features/play-computer/hooks/use-game-review';
import { describeEvaluation, formatEvaluation, MARKS, moveLabel, type Mark, type PivotalMoment } from '@/features/play-computer/utils/review';
import type { SavedGame } from '@/features/play-computer/utils/saved-game';
import { useFocusOnArrival } from '@/hooks/use-focus-on-arrival';
import './move-list.css';
import './review.css';

/**
 * The review of a finished game, in the side panel (at /play/review): the result, buttons to
 * step through the game (first, previous, next, last; ← → Home End on the keyboard), the move
 * shown with its evaluation, its flag and the engine's better move, the moves (any of them
 * opens its position, flags beside the flagged ones) and the game's turning points, each
 * explained ("Move 23 Qxf7 lost the advantage; best was Nd5"). Then Play again or Main menu.
 * With no finished game yet, it says so and offers a game.
 */
export function ReviewPanel({ game, review, levelName, onPlayAgain, onPlay, onMenu, leaving = false, delay }: {
  game: SavedGame | null;
  review: GameReview;
  levelName: string;
  onPlayAgain: () => void;
  onPlay: () => void;
  onMenu: () => void;
  leaving?: boolean;
  delay?: string;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnArrival(heading);

  return (
    <SidePanel labelledBy={titleId} leaving={leaving} delay={delay} className="match-panel review-panel">
      <span className="side-panel__eyebrow">02 / In-Game Chess · Review</span>
      <h1 id={titleId} className="side-panel__title" tabIndex={-1} ref={heading}>Game review</h1>
      {game ? (
        <>
          <p className="review-panel__result">
            <strong>{game.result.title}</strong> {game.result.reason} <span>· against the computer ({levelName})</span>
          </p>
          <ReviewSteps review={review} game={game} />
          <ShownMove review={review} game={game} />
          <ReviewMoves review={review} game={game} />
          <TurningPoints review={review} />
          <ReviewStatus review={review} />
          <div className="panel-actions">
            <button type="button" className="panel-button" onClick={onPlayAgain}>Play again</button>
            <button type="button" className="panel-button panel-button--ghost" onClick={onMenu}>Main menu</button>
          </div>
        </>
      ) : (
        <>
          <p className="side-panel__lead">No finished game to review yet. Play the computer: when the game ends, its review opens here.</p>
          <div className="panel-actions">
            <button type="button" className="panel-button" onClick={onPlay}>Play a game</button>
            <button type="button" className="panel-button panel-button--ghost" onClick={onMenu}>Main menu</button>
          </div>
        </>
      )}
    </SidePanel>
  );
}

/** "23. Qxf7" for White's move, "23… Nf6" for Black's. */
const written = (ply: number, san: string) => `${Math.ceil(ply / 2)}${ply % 2 === 1 ? '.' : '…'} ${san}`;

/** First, previous, next, last, around where the review is. The buttons stay focusable at
 *  either end (aria-disabled), so focus is never lost by stepping onto the last move. */
function ReviewSteps({ review, game }: { review: GameReview; game: SavedGame }) {
  const { ply, total, goTo } = review;
  const step = (label: string, target: number, icon: ReactNode) => {
    const unavailable = target === ply || target < 0 || target > total;
    return (
      <button
        type="button"
        className="review-steps__button"
        aria-label={label}
        aria-disabled={unavailable || undefined}
        onClick={() => {
          if (!unavailable) goTo(target);
        }}
      >
        {icon}
      </button>
    );
  };
  return (
    <div className="review-steps" role="group" aria-label="Step through the game">
      {step('First position', 0, <ChevronsLeft size={18} aria-hidden="true" />)}
      {step('Previous move', ply - 1, <ChevronLeft size={18} aria-hidden="true" />)}
      <p className="review-steps__where">
        <strong>{ply === 0 ? 'Start' : written(ply, game.history[ply - 1] ?? '')}</strong>
        <span>{ply} / {total}</span>
      </p>
      {step('Next move', ply + 1, <ChevronRight size={18} aria-hidden="true" />)}
      {step('Last position', total, <ChevronsRight size={18} aria-hidden="true" />)}
    </div>
  );
}

/** A flag as a small tag: its symbol, and its name unless `short`. */
export function MarkTag({ mark, short = false }: { mark: Mark; short?: boolean }) {
  return (
    <span className="review-flag" data-mark={mark}>
      <b aria-hidden="true">{MARKS[mark].symbol}</b>
      {short ? <span className="sr-only">{MARKS[mark].label}</span> : <span>{MARKS[mark].label}</span>}
    </span>
  );
}

/** The move that led to the position shown: its flag, the evaluation, and for a flagged move
 *  the engine's better one. */
function ShownMove({ review, game }: { review: GameReview; game: SavedGame }) {
  const { ply, current, summary } = review;
  const mark = summary?.marks[ply - 1] ?? null;
  const san = game.history[ply - 1];
  return (
    <section className="review-move" aria-label="Move shown" aria-live="polite">
      {ply === 0 || !san ? (
        <p className="review-move__line">The starting position. Step forward with → or the buttons.</p>
      ) : (
        <>
          <p className="review-move__line">
            <strong>{current ? moveLabel(current) : `Move ${written(ply, san)}`}</strong>
            <span className="review-move__by">{ply % 2 === 1 ? 'You' : 'Computer'}</span>
            {mark && <MarkTag mark={mark} />}
          </p>
          {current && (
            <p className="review-move__eval">
              <b>{formatEvaluation(current)}</b> {describeEvaluation(current)}
            </p>
          )}
          {mark && current?.bestMoveSan && current.bestMoveSan !== current.san && (
            <p className="review-move__best">
              Best was <strong>{current.bestMoveSan}</strong> (the arrow on the board)
            </p>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The game as a score sheet where every move is a button to its position. Only the move shown
 * is in the tab order (a roving tab stop); ← and → move it, and focus with it. Flags sit
 * beside the flagged moves.
 */
function ReviewMoves({ review, game }: { review: GameReview; game: SavedGame }) {
  const titleId = useId();
  const list = useRef<HTMLOListElement>(null);
  const { ply, goTo, summary } = review;

  // Keep the move shown in view, scrolling the list itself (never the page); if focus is in
  // the list, it follows the move shown.
  useEffect(() => {
    const element = list.current;
    const shown = element?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!element || !shown) return;
    const box = element.getBoundingClientRect();
    const item = shown.getBoundingClientRect();
    if (item.top < box.top) element.scrollTop -= box.top - item.top + 4;
    else if (item.bottom > box.bottom) element.scrollTop += item.bottom - box.bottom + 4;
    if (element.contains(document.activeElement) && document.activeElement !== shown) shown.focus({ preventScroll: true });
  }, [ply]);

  const pairs: number[] = [];
  for (let index = 1; index <= game.history.length; index += 2) pairs.push(index);
  const tabStop = ply === 0 ? 1 : ply;
  const move = (at: number) => {
    const san = game.history[at - 1];
    if (san === undefined) return null;
    const mark = summary?.marks[at - 1] ?? null;
    return (
      <button
        type="button"
        className="score-sheet__move review-moves__move"
        data-mark={mark ?? undefined}
        aria-current={at === ply ? 'step' : undefined}
        // A flagged move says its flag in words ("g4, Blunder"); the symbol is for the eye.
        aria-label={mark ? `${san}, ${MARKS[mark].label}` : undefined}
        tabIndex={at === tabStop ? 0 : -1}
        onClick={() => goTo(at)}
      >
        {san}
        {mark && <sup className="review-moves__flag" aria-hidden="true">{MARKS[mark].symbol}</sup>}
      </button>
    );
  };

  return (
    <section className="score-sheet review-moves" aria-labelledby={titleId}>
      <div className="score-sheet__head">
        <h2 id={titleId} className="score-sheet__title">Moves</h2>
        <SoundToggle />
      </div>
      <ol ref={list} className="score-sheet__moves" aria-labelledby={titleId}>
        {pairs.map((first) => (
          <li key={first} className="score-sheet__pair">
            <span className="score-sheet__number">{Math.ceil(first / 2)}.</span>
            {move(first)}
            {move(first + 1)}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The moments that turned the game, each a button to its position. */
function TurningPoints({ review }: { review: GameReview }) {
  const titleId = useId();
  const moments = review.summary?.moments;
  if (!moments) return null;
  return (
    <section className="review-moments" aria-labelledby={titleId}>
      <h2 id={titleId} className="score-sheet__title">Turning points</h2>
      {moments.length === 0 ? (
        <p className="review-moments__none">No big swings: neither side let the game slip.</p>
      ) : (
        <ol className="review-moments__list">
          {moments.map((moment) => (
            <li key={moment.ply}>
              <Moment moment={moment} shown={moment.ply === review.ply} onOpen={() => review.goTo(moment.ply)} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Moment({ moment, shown, onOpen }: { moment: PivotalMoment; shown: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="review-moments__moment" aria-current={shown ? 'step' : undefined} onClick={onOpen}>
      <span className="review-moments__who">{moment.side === 'white' ? 'You' : 'Computer'}</span>
      {moment.mark && <MarkTag mark={moment.mark} short />}
      <span className="review-moments__text">{moment.text}</span>
    </button>
  );
}

/** While the engine works, or if it could not: a line, and a way to try again. */
function ReviewStatus({ review }: { review: GameReview }) {
  if (review.loading) {
    return <p className="review-status" role="status">Analysing every move… This can take a few seconds.</p>;
  }
  if (review.error && !review.analysis) {
    return (
      <div className="review-status" role="alert">
        <p>{review.error.message}</p>
        <button type="button" className="panel-button panel-button--ghost" onClick={review.retry}>Try again</button>
      </div>
    );
  }
  return null;
}
