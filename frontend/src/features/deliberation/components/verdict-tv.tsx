import { useId, useRef, type CSSProperties } from 'react';
import { CircleAlert } from 'lucide-react';
import type { Verdict } from '@/features/deliberation/utils/verdict';
import { useFocusOnArrival } from '@/hooks/use-focus-on-arrival';
import type { TimeClass } from '@/types/chess';
import { formatTimeClass } from '@/utils/format';
import './vs-tv.css';
import './verdict-tv.css';

/**
 * The verdict set: a television of the same make as the VS set, lowered on its cables beside
 * the table once the spotlight has found the winner. It names the winner, their expected
 * score and why they won (the statistics they are better at), with every statistic compared
 * below. Given `failure` instead, it says the players could not be compared, with Try again.
 * Focus goes to its title when it lands; `leaving` raises it.
 */
export function VerdictTv({ timeClass, verdict, failure, leaving = false, onNew, onMenu }: {
  timeClass: TimeClass;
  verdict?: Verdict;
  failure?: { message: string; retry: () => void };
  leaving?: boolean;
  onNew: () => void;
  onMenu: () => void;
}) {
  const ids = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnArrival(heading);

  return (
    <div className="verdict-rig" data-leaving={leaving || undefined}>
      <div className="verdict-tv" role="group" aria-labelledby={`${ids}-title`}>
        <div className="vs-tv__cabinet">
          <div className="verdict-tv__screen">
            <div className="verdict-tv__scroll">
              <header className="verdict-tv__head vs-tune">
                <span className="vs-tv__eyebrow">Verdict · {formatTimeClass(timeClass)} · all time</span>
                <h1 ref={heading} tabIndex={-1} id={`${ids}-title`} className="vs-tv__title verdict-tv__title">
                  {verdict ? verdict.headline : 'No verdict'}
                </h1>
              </header>
              {verdict ? <VerdictBody verdict={verdict} /> : <FailureBody message={failure?.message ?? 'The comparison failed.'} />}
            </div>
            <i className="vs-tv__glass" aria-hidden="true" />
          </div>
          <div className="vs-tv__controls">
            <span className="vs-tv__grille" aria-hidden="true" />
            <p className="vs-tv__hint">{verdict ? 'Compare again, or two other players.' : 'Nothing was compared.'}</p>
            <div className="vs-tv__keys">
              {verdict ? (
                <>
                  <button type="button" className="tv-key" onClick={onMenu} disabled={leaving}>Menu</button>
                  <button type="button" className="tv-key tv-key--primary" onClick={onNew} disabled={leaving}>New comparison</button>
                </>
              ) : (
                <>
                  <button type="button" className="tv-key" onClick={onNew} disabled={leaving}>Change players</button>
                  <button type="button" className="tv-key tv-key--primary" onClick={failure?.retry} disabled={leaving}>Try again</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The verdict: summary, expected scores, the reasons and every statistic side by side. */
function VerdictBody({ verdict }: { verdict: Verdict }) {
  const ids = useId();
  const { names, likelihood, winner, reasons, rows, summary } = verdict;
  return (
    <>
      <p className="verdict-tv__summary vs-tune">{summary}</p>
      {likelihood && (
        <div className="verdict-meter vs-tune">
          <p className="verdict-meter__labels">
            <span data-winner={winner === 'player1' || undefined}><b>{names.player1}</b> {likelihood.player1}%</span>
            <span data-winner={winner === 'player2' || undefined}><b>{names.player2}</b> {likelihood.player2}%</span>
          </p>
          {/* Each player's expected score, from the two ratings; the bar draws the same split
              (Player 1 in ivory, Player 2 in ink, as at the table) and the summary says it in words. */}
          <div className="verdict-meter__bar" aria-hidden="true">
            <span style={{ '--share': likelihood.player1 / 100 } as CSSProperties} />
          </div>
        </div>
      )}
      {reasons.length > 0 && (
        <section className="verdict-reasons vs-tune" aria-labelledby={`${ids}-why`}>
          <h2 id={`${ids}-why`}>{winner ? `Why ${names[winner]}` : 'Why there is no winner'}</h2>
          <ul>
            {reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </section>
      )}
      <table className="verdict-table vs-tune">
        <caption>All-time statistics <span>(ink marks the better figure)</span></caption>
        <thead>
          <tr><th scope="col">Statistic</th><th scope="col">{names.player1}</th><th scope="col">{names.player2}</th></tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {(['player1', 'player2'] as const).map((side) => (
                <td key={side} data-better={row.better === side || undefined}>
                  <span>{row[side]}</span>
                  {row.better === side && <span className="sr-only"> (better)</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FailureBody({ message }: { message: string }) {
  return (
    <div className="verdict-tv__failure vs-tune" role="alert">
      <CircleAlert size={30} strokeWidth={2.2} aria-hidden="true" />
      <p><strong>The players could not be compared.</strong> {message}</p>
    </div>
  );
}
