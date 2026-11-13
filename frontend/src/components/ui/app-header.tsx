import { Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@/config/routes';

/** Top bar: no visible bar, only the Search control floating over the stage (in every API mode). */
export function AppHeader() {
  return (
    <header className="app-header">
      <nav className="primary-nav" aria-label="Main navigation">
        <NavLink to={ROUTES.search} end className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}>
          <Search size={18} aria-hidden="true" />
          <span>Search</span>
        </NavLink>
      </nav>
    </header>
  );
}
