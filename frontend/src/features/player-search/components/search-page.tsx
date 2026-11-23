import { useEffect, useRef } from 'react';
import { OpponentChair, SeatedPlayer, TableBoard } from '@/components/chess/stage-art';
import { MainMenu } from '@/components/ui/main-menu';
import { SearchForm } from '@/features/player-search/components/search-form';
import './search-page.css';

/**
 * The table set: the heading above the table; on its front, the search with the main menu
 * right under it (one place to look things up or pick a mode); the player on the left and
 * the opponent's chair on the right. It is the focal point of the stage (app/stage-layout).
 *
 * `guest` is the username of the player who has been found. While it is set the camera is
 * on the opponent's seat: a guest sits in the chair, the tag above it carries the name,
 * and the search itself is inert until the visitor comes back. `guestAvatar` is that
 * player's profile picture, if they have one: it becomes the guest's head.
 *
 * `topDown` names the top-down view the camera has moved to (In-Game Chess or Deliberation),
 * if any. The table set is out of view and inert meanwhile.
 */
export function SearchPage({ guest, guestAvatar, topDown = null }: {
  guest?: string;
  guestAvatar?: string | null;
  topDown?: 'computer' | 'deliberation' | null;
}) {
  const away = Boolean(guest);
  const table = useRef<HTMLDivElement>(null);
  const wasAway = useRef(away);
  const lastTopDown = useRef(topDown);
  useEffect(() => {
    // Coming back from a player: put the keyboard where the visitor left off.
    if (wasAway.current && !away) table.current?.querySelector<HTMLInputElement>('#player-query')?.focus({ preventScroll: true });
    wasAway.current = away;
  }, [away]);
  useEffect(() => {
    // Coming back from a top-down view: focus the menu item that opened it.
    if (lastTopDown.current && !topDown) {
      table.current?.querySelector<HTMLElement>(`.main-menu__item[data-mode="${lastTopDown.current}"]`)?.focus({ preventScroll: true });
    }
    lastTopDown.current = topDown;
  }, [topDown]);

  return (
    <div className="search-page table-set" ref={table} inert={away || topDown !== null} data-away={away || undefined}>
      <div className="search-copy">
        <h1><span className="kinetic-line">Find your</span><span className="kinetic-line">player<span className="muted-period">.</span></span></h1>
        <p>Discover the numbers behind every move.</p>
      </div>
      <div className="stage-table">
        <SeatedPlayer />
        <OpponentChair occupied={away} avatar={guestAvatar} />
        <span className="seat-tag" aria-hidden="true">
          <b>{guest ?? 'Open seat'}</b>
          <svg viewBox="0 0 60 70" focusable="false"><path d="M42 4 C56 22 47 45 20 59 M20 59 L25 42 M20 59 L37 62" /></svg>
        </span>
        <TableBoard />
        <div className="stage-table__top" />
        <div className="stage-table__front">
          <SearchForm />
          <MainMenu />
        </div>
      </div>
    </div>
  );
}
