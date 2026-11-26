import { useEffect, useId, useRef } from 'react';
import './move-list.css';

/**
 * The moves so far in standard algebraic notation, numbered in pairs as a score sheet writes
 * them (1. e4 e5 2. Nf3 Nc6). It scrolls by itself to the newest move whenever one is added,
 * and with the keyboard (it takes focus when there is more than fits). `pending` marks the last
 * move as still waiting for the server, which confirms it with the computer's reply.
 */
export function MoveList({ moves, pending = false }: { moves: readonly string[]; pending?: boolean }) {
  const titleId = useId();
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    // Scroll the list itself, never the page.
    const element = list.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [moves.length]);

  const pairs: [string, string | undefined][] = [];
  for (let index = 0; index < moves.length; index += 2) pairs.push([moves[index] ?? '', moves[index + 1]]);
  const last = moves.length - 1;

  return (
    <section className="score-sheet" aria-labelledby={titleId}>
      <h2 id={titleId} className="score-sheet__title">Moves</h2>
      {moves.length === 0 ? (
        <p className="score-sheet__empty">No moves yet. You play White: your move first.</p>
      ) : (
        // A scrolling region, so it can be focused and scrolled with the keyboard.
        <ol ref={list} className="score-sheet__moves" tabIndex={0} aria-labelledby={titleId}>
          {pairs.map(([white, black], pair) => (
            <li key={pair} className="score-sheet__pair">
              <span className="score-sheet__number">{pair + 1}.</span>
              <Move san={white} latest={pair * 2 === last} pending={pending && pair * 2 === last} />
              {black !== undefined && <Move san={black} latest={pair * 2 + 1 === last} pending={pending && pair * 2 + 1 === last} />}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Move({ san, latest, pending }: { san: string; latest: boolean; pending: boolean }) {
  return (
    <span className="score-sheet__move" data-latest={latest || undefined} data-pending={pending || undefined} aria-current={latest ? 'step' : undefined}>
      {san}
    </span>
  );
}
