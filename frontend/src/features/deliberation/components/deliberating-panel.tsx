import { useId, useRef, type CSSProperties } from 'react';
import { Check } from 'lucide-react';
import { SidePanel } from '@/components/ui/side-panel';
import type { PlayerPair } from '@/features/deliberation/components/vs-tv';
import { DELIBERATION_STEPS } from '@/features/deliberation/hooks/use-verdict-sequence';
import { useFocusOnArrival } from '@/hooks/use-focus-on-arrival';
import type { TimeClass } from '@/types/chess';
import { formatTimeClass } from '@/utils/format';

/**
 * The panel beside the table while the two players are compared: every step, the current
 * one marked and announced, and a progress bar (see `useVerdictSequence` for which steps are
 * real and which are timed). Focus goes to its heading, as the VS set it replaces is gone.
 */
export function DeliberatingPanel({ players, timeClass, step, progress, leaving = false }: {
  players: PlayerPair;
  timeClass: TimeClass;
  step: number;
  progress: number;
  leaving?: boolean;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useFocusOnArrival(heading);
  const current = DELIBERATION_STEPS[step] ?? DELIBERATION_STEPS[0];

  return (
    <SidePanel labelledBy={titleId} leaving={leaving} delay=".1s" className="deliberating-panel">
      <span className="side-panel__eyebrow">03 / Deliberation</span>
      <h1 id={titleId} className="side-panel__title" tabIndex={-1} ref={heading}>Deliberating…</h1>
      <p className="side-panel__lead">
        {players[0].username} vs {players[1].username} · {formatTimeClass(timeClass)}, all time
      </p>
      <ol className="deliberating__steps" aria-label="Steps">
        {DELIBERATION_STEPS.map((label, index) => {
          const state = index < step ? 'done' : index === step ? 'current' : 'todo';
          return (
            <li key={label} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="deliberating__mark" aria-hidden="true">{state === 'done' && <Check size={12} strokeWidth={3.5} />}</span>
              {label}
            </li>
          );
        })}
      </ol>
      <div
        className="deliberating__progress"
        role="progressbar"
        aria-label="Comparison progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span style={{ '--progress': progress } as CSSProperties} />
      </div>
      <p className="sr-only" role="status">{`${current}…`}</p>
    </SidePanel>
  );
}
