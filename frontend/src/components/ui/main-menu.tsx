import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import './main-menu.css';

export type MenuMode = 'search' | 'computer' | 'deliberation';

const ITEMS: readonly { mode: MenuMode; label: string; to: string }[] = [
  { mode: 'search', label: '01 / Player lookup', to: ROUTES.search },
  { mode: 'computer', label: '02 / In-Game Chess', to: ROUTES.play },
  { mode: 'deliberation', label: '03 / Deliberation', to: ROUTES.deliberation },
];

/**
 * The main menu: three numbered stickers in a row under the search on the table's front.
 * The current one is the ink sticker; the other two open their mode, and the camera moves
 * to it.
 */
export function MainMenu() {
  return (
    <nav className="main-menu" aria-label="Main menu">
      <ul>
        {ITEMS.map(({ mode, label, to }) => (
          <li key={mode}>
            <NavLink to={to} end className="main-menu__item" data-mode={mode}>{label}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
