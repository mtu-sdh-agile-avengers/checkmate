import { useId, useRef, type ReactNode } from 'react';
import { SidePanel } from '@/components/ui/side-panel';
import { useFocusOnArrival } from '@/hooks/use-focus-on-arrival';
import './match-panel.css';

export type MatchSeat = { name: string; detail: string; color: 'white' | 'black' };

/**
 * The panel once a game is set up: who plays which colour, whose move it is, and where to go
 * next (`actions`). `note` says what is happening on the board; `children` (e.g. the move list)
 * go between the players and the note. Focus moves to its heading when it appears.
 */
export function MatchPanel({ eyebrow, title, seats, note, actions, leaving = false, delay, toMove = 'white', children }: {
  eyebrow: string;
  title: string;
  seats: readonly [MatchSeat, MatchSeat];
  note: string;
  actions: ReactNode;
  leaving?: boolean;
  delay?: string;
  /** Whose move it is ("To move" tag); null once the game is over. */
  toMove?: 'white' | 'black' | null;
  children?: ReactNode;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  // The panel stays hidden until it slides in: focus its heading as soon as it can take it.
  useFocusOnArrival(heading);

  return (
    <SidePanel labelledBy={titleId} leaving={leaving} delay={delay} className="match-panel">
      <span className="side-panel__eyebrow">{eyebrow}</span>
      <h1 id={titleId} className="side-panel__title" tabIndex={-1} ref={heading}>{title}</h1>
      <ul className="match-panel__seats" aria-label="Players">
        {seats.map((seat) => (
          <li key={seat.color} className="match-panel__seat" data-color={seat.color}>
            <span className="match-panel__chip" aria-hidden="true" />
            <span className="match-panel__who">
              <strong>{seat.name}</strong>
              <small>{seat.detail}</small>
            </span>
            {seat.color === toMove && <span className="match-panel__turn">To move</span>}
          </li>
        ))}
      </ul>
      {children}
      <p className="match-panel__note" aria-live="polite">{note}</p>
      <div className="panel-actions">{actions}</div>
    </SidePanel>
  );
}
