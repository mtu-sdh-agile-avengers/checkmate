import { useId, useMemo, type CSSProperties } from 'react';
import { PieceArt, type PieceKind, type PieceTone } from '@/components/chess/stage-art';
import { formatClock, useElapsed } from '@/features/play-computer/hooks/use-elapsed';
import { readGameStats, START_FEN, type SideStats } from '@/features/play-computer/utils/game-stats';
import './game-tv.css';

/**
 * The statistics TV beside the board in In-Game Chess: a small television of the same make as
 * the player view's, showing the game as it goes. Everything is read from the position the
 * server sends after each move (`fen`) and the moves so far (`history`, in SAN), so it updates
 * with every move: the move number and half-moves, the clock, the last move, the material
 * balance, the pieces each side has left and the pieces each has taken.
 * The player is White (You), the computer Black.
 */
export function GameTv({ fen, history, startedAt, over, leaving = false }: {
  fen: string | null;
  history: readonly string[];
  startedAt: number | null;
  over: boolean;
  leaving?: boolean;
}) {
  const titleId = useId();
  const stats = useMemo(() => readGameStats(fen ?? START_FEN, history.length), [fen, history.length]);
  const elapsed = useElapsed(startedAt, !over);
  const last = history.at(-1);
  const lastBy = history.length % 2 === 1 ? 'you' : 'computer';
  const { white, black, advantage } = stats;
  const total = white.material + black.material;
  const share = total > 0 ? white.material / total : 0.5;
  const balance = advantage.side === null ? 'Level' : `+${advantage.points} ${advantage.side === 'white' ? 'You' : 'Computer'}`;

  return (
    <aside className="game-tv" aria-labelledby={titleId} data-leaving={leaving || undefined}>
      <div className="game-tv__cabinet">
        <div className="game-tv__screen">
          {/* Re-keyed every move, so the picture tunes in again with the new figures. */}
          <div className="game-tv__picture" key={history.length}>
            <header className="game-tv__head">
              <span className="game-tv__channel">CH 2 · {over ? 'FINAL' : 'LIVE'}</span>
              <h2 id={titleId}>Game stats</h2>
            </header>
            <dl className="game-tv__figures">
              <div><dt>Move</dt><dd>{stats.fullMoves}</dd></div>
              <div><dt>Half-moves</dt><dd>{stats.halfMoves}</dd></div>
              <div><dt>Time</dt><dd>{formatClock(elapsed)}</dd></div>
              <div><dt>Last move</dt><dd>{last ? <>{last} <small>({lastBy})</small></> : '—'}</dd></div>
            </dl>
            <section className="game-tv__material" aria-label="Material">
              <p><span>Material</span><strong>{balance}</strong></p>
              <div className="game-tv__balance" aria-hidden="true">
                <span style={{ '--share': share } as CSSProperties} />
              </div>
              <p className="game-tv__totals"><span>You {white.material}</span><span>Computer {black.material}</span></p>
            </section>
            <SideRow label="You" detail="White" side={white} took={black.lost} tookTone="ebony" />
            <SideRow label="Computer" detail="Black" side={black} took={white.lost} tookTone="ivory" />
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

/** One side: pieces left, and the pieces it has taken (the other side's, in their tone). */
function SideRow({ label, detail, side, took, tookTone }: {
  label: string;
  detail: string;
  side: SideStats;
  took: readonly PieceKind[];
  tookTone: PieceTone;
}) {
  return (
    <section className="game-tv__side" aria-label={label}>
      <p className="game-tv__side-head">
        <span className="game-tv__chip" data-tone={tookTone === 'ebony' ? 'ivory' : 'ebony'} aria-hidden="true" />
        <strong>{label}</strong> <span>{detail} · {side.pieces} pieces</span>
      </p>
      <p className="game-tv__taken">
        {took.length === 0 ? (
          <span className="game-tv__none">Nothing taken yet</span>
        ) : (
          <>
            <span className="sr-only">Took: {took.join(', ')}</span>
            {took.map((kind, index) => (
              <span key={`${kind}-${index}`} className="game-tv__piece" aria-hidden="true"><PieceArt kind={kind} tone={tookTone} /></span>
            ))}
          </>
        )}
      </p>
    </section>
  );
}
