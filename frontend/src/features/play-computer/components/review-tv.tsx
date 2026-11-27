import { useId, type CSSProperties, type MouseEvent } from 'react';
import type { GameReview } from '@/features/play-computer/hooks/use-game-review';
import { describeEvaluation, formatEvaluation, MARK_ORDER, MARKS, type Mark, type MarkCounts } from '@/features/play-computer/utils/review';
import type { PlayerColor } from '@/types/chess';
import './game-tv.css';
import './review.css';

/** The graph's drawing size; it stretches to the screen's width. */
const GRAPH_W = 300;
const GRAPH_H = 90;

/**
 * The TV beside the board during a review (the statistics TV's channel 3): the evaluation of
 * the position shown, in pawns ("+1.3", "M3") and in words, the winning chances as a bar, the
 * evaluation across the whole game as a graph (a click on it opens that position; the flagged
 * moves are dots on it), how many moves of each side were flagged, and which engine judged.
 * While the engine works, or if it could not, the screen says so.
 */
export function ReviewTv({ review, leaving = false, delayed = false }: {
  review: GameReview;
  leaving?: boolean;
  /** Arriving with the camera (a reload): slide in with the panel, after the camera move. */
  delayed?: boolean;
}) {
  const titleId = useId();
  const { analysis, summary, ply, current } = review;
  const approximate = analysis?.engine.toLowerCase().includes('approximate') ?? false;

  return (
    <aside
      className="game-tv review-tv"
      aria-labelledby={titleId}
      data-leaving={leaving || undefined}
      style={delayed ? ({ '--tv-delay': '1.05s' } as CSSProperties) : undefined}
    >
      <div className="game-tv__cabinet">
        <div className="game-tv__screen">
          <div className="game-tv__picture">
            <header className="game-tv__head">
              <span className="game-tv__channel">CH 3 · REVIEW</span>
              <h2 id={titleId}>Evaluation</h2>
            </header>
            {analysis && summary ? (
              <>
                <p className="review-tv__score">
                  <strong>{formatEvaluation(current)}</strong>
                  <span>{describeEvaluation(current)}</span>
                </p>
                <Chances chance={summary.chances[ply] ?? 0.5} />
                <EvaluationGraph chances={summary.chances} marks={summary.marks} ply={ply} onOpen={review.goTo} />
                <MarkTable counts={summary.counts} />
                <p className="review-tv__engine">
                  {analysis.engine} · depth {analysis.depth}
                  {approximate && <small>Rough figures: with Stockfish (STOCKFISH_PATH set) the review is far more precise.</small>}
                </p>
              </>
            ) : (
              <p className="review-tv__signal" data-state={review.loading ? 'loading' : 'off'}>
                {review.loading ? 'Analysing every move…' : review.error ? 'No signal: the analysis did not load.' : 'Nothing to review yet.'}
              </p>
            )}
          </div>
          <i className="game-tv__glass" aria-hidden="true" />
        </div>
        <div className="game-tv__controls" aria-hidden="true">
          <span className="game-tv__grille" />
          <span className="game-tv__knobs"><i /><i /></span>
        </div>
      </div>
    </aside>
  );
}

/** White's chances in the position shown: the split as a bar, You ivory, the computer ink. */
function Chances({ chance }: { chance: number }) {
  const you = Math.round(chance * 100);
  return (
    <section className="game-tv__material" aria-label="Winning chances">
      <p><span>Winning chances</span></p>
      <div className="game-tv__balance" aria-hidden="true">
        <span style={{ '--share': chance } as CSSProperties} />
      </div>
      <p className="game-tv__totals"><span>You {you}%</span><span>Computer {100 - you}%</span></p>
    </section>
  );
}

/**
 * White's chances over the game: ivory under the curve is White's share, ink over it Black's;
 * a line marks the position shown and a dot each flagged move. A mouse shortcut (a click opens
 * the position under it): the buttons and the move list do the same from the keyboard.
 */
function EvaluationGraph({ chances, marks, ply, onOpen }: {
  chances: readonly number[];
  marks: readonly (Mark | null)[];
  ply: number;
  onOpen: (ply: number) => void;
}) {
  const last = Math.max(1, chances.length - 1);
  const x = (index: number) => (index / last) * GRAPH_W;
  const y = (chance: number) => (1 - chance) * GRAPH_H;
  const line = chances.map((chance, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(2)} ${y(chance).toFixed(2)}`).join('');
  const open = (event: MouseEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width > 0) onOpen(Math.round(((event.clientX - box.left) / box.width) * last));
  };
  return (
    <div className="review-tv__graph" aria-hidden="true" onClick={open}>
      <svg viewBox={`0 0 ${GRAPH_W} ${GRAPH_H}`} preserveAspectRatio="none" focusable="false">
        <path className="review-tv__graph-area" d={`${line}L${GRAPH_W} ${GRAPH_H}L0 ${GRAPH_H}Z`} />
        <line className="review-tv__graph-mid" x1="0" x2={GRAPH_W} y1={GRAPH_H / 2} y2={GRAPH_H / 2} />
        <line className="review-tv__graph-cursor" x1={x(ply)} x2={x(ply)} y1="0" y2={GRAPH_H} />
      </svg>
      {marks.map((mark, index) =>
        mark ? (
          <span
            key={index}
            className="review-tv__dot"
            data-mark={mark}
            style={{ left: `${(x(index + 1) / GRAPH_W) * 100}%`, top: `${(y(chances[index + 1] ?? 0.5) / GRAPH_H) * 100}%` }}
          />
        ) : null,
      )}
    </div>
  );
}

/** How many moves of each side were flagged, by flag. */
function MarkTable({ counts }: { counts: Record<PlayerColor, MarkCounts> }) {
  return (
    <table className="review-tv__marks">
      <caption className="sr-only">Flagged moves of each side</caption>
      <thead>
        <tr>
          <th scope="col"><span className="sr-only">Side</span></th>
          {MARK_ORDER.map((mark) => (
            <th key={mark} scope="col" data-mark={mark}>
              <b aria-hidden="true">{MARKS[mark].symbol}</b>
              <span>{MARKS[mark].plural}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(['white', 'black'] as const).map((side) => (
          <tr key={side}>
            <th scope="row">{side === 'white' ? 'You' : 'Computer'}</th>
            {MARK_ORDER.map((mark) => <td key={mark}>{counts[side][mark]}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
