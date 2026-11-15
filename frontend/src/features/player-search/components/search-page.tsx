import { useEffect, useRef } from 'react';
import { OpponentChair, SeatedPlayer, TableBoard } from '@/components/chess/stage-art';
import { SearchForm } from '@/features/player-search/components/search-form';
import './search-page.css';

/**
 * The table set: heading above the table, search on its front, the player on the left
 * and the opponent's chair on the right. It is the focal point of the stage (app/stage-layout).
 *
 * `guest` is the username of the player who has been found. While it is set the camera is
 * on the opponent's seat: an anonymous guest sits in the chair, the tag above it carries
 * the name, and the search itself is inert until the visitor comes back.
 */
export function SearchPage({ guest }: { guest?: string }) {
  const away = Boolean(guest);
  const table = useRef<HTMLDivElement>(null);
  const wasAway = useRef(away);
  useEffect(() => {
    // Coming back from a player: put the keyboard where the visitor left off.
    if (wasAway.current && !away) table.current?.querySelector<HTMLInputElement>('#player-query')?.focus({ preventScroll: true });
    wasAway.current = away;
  }, [away]);

  return (
    <div className="search-page table-set" ref={table} inert={away}>
      <div className="search-copy">
        <span className="eyebrow">01 / PLAYER LOOKUP</span>
        <h1><span className="kinetic-line">Find your</span><span className="kinetic-line">player<span className="muted-period">.</span></span></h1>
        <p>Discover the numbers behind every move.</p>
      </div>
      <div className="stage-table">
        <SeatedPlayer />
        <OpponentChair occupied={away} />
        <span className="seat-tag" aria-hidden="true">
          <b>{guest ?? 'Open seat'}</b>
          <svg viewBox="0 0 60 70" focusable="false"><path d="M42 4 C56 22 47 45 20 59 M20 59 L25 42 M20 59 L37 62" /></svg>
        </span>
        <TableBoard />
        <div className="stage-table__top" />
        <div className="stage-table__front"><SearchForm /></div>
      </div>
    </div>
  );
}
