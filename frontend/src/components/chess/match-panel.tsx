import { useEffect, useId, useRef, type ReactNode } from 'react';
import { SidePanel } from '@/components/ui/side-panel';
import './match-panel.css';

export type MatchSeat = { name: string; detail: string; color: 'white' | 'black' };

/**
 * The panel once a game is set up: who plays which colour, whose move it is, and where to go
 * next (`actions`). `note` says what the board can do; until the game engine exists, that
 * it is a preview. Focus moves to its heading when it appears.
 */
export function MatchPanel({ eyebrow, title, seats, note, actions, leaving = false, delay }: {
  eyebrow: string;
  title: string;
  seats: readonly [MatchSeat, MatchSeat];
  note: string;
  actions: ReactNode;
  leaving?: boolean;
  delay?: string;
}) {
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // The panel stays hidden until it slides in, and a hidden heading cannot take focus:
    // keep trying, a frame at a time, until it can (or give up after a couple of seconds).
    const started = performance.now();
    let frame = 0;
    const focus = () => {
      const element = heading.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      if (document.activeElement !== element && performance.now() - started < 2500) frame = requestAnimationFrame(focus);
    };
    focus();
    return () => cancelAnimationFrame(frame);
  }, []);

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
            {seat.color === 'white' && <span className="match-panel__turn">To move</span>}
          </li>
        ))}
      </ul>
      <p className="match-panel__note">{note}</p>
      <div className="panel-actions">{actions}</div>
    </SidePanel>
  );
}
