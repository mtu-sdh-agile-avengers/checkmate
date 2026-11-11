import { BarChart3, Crown, Search, TrendingUp, UserRound, type LucideIcon } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { getApiMode } from '@/config/api';
import { APP_NAME, DEMO_USERNAME } from '@/config/constants';
import { ROUTES } from '@/config/routes';

type NavItem = { label: string; path: string; icon: LucideIcon; end: boolean };

export function AppHeader() {
  const { username } = useParams<{ username: string }>();
  const live = getApiMode() === 'live';
  // Demo mode falls back to the demo player; live mode shows player links only after a search
  const player = username ?? (live ? null : DEMO_USERNAME);
  const links: NavItem[] = [{ label: 'Search', path: ROUTES.search, icon: Search, end: true }];
  if (player) {
    links.push({ label: 'Statistics', path: ROUTES.summary(player), icon: BarChart3, end: false });
    // The Overall page has no API endpoint yet, so it is only offered with demo data
    if (!live) {
      links.push({ label: 'Overall', path: ROUTES.overall(player), icon: TrendingUp, end: false });
    }
    links.push({ label: 'Profile', path: ROUTES.profile(player), icon: UserRound, end: true });
  }
  return (
    <header className="app-header">
      <NavLink to="/" className="brand" aria-label={`${APP_NAME} home`}>
        <Crown size={30} strokeWidth={2.5} fill="currentColor" />
        <span>{APP_NAME}</span>
      </NavLink>
      <nav className="primary-nav" aria-label="Main navigation">
        {links.map(({ label, path, icon: Icon, end }) => (
          <NavLink
            key={label}
            to={path}
            end={end}
            className={({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`}
          >
            <Icon size={18} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      {getApiMode() === 'mock' && (
        <div className="header-demo" title="Example data, not a live account">
          <span className="demo-dot" />
          <span className="demo-caption">DEMO</span>
          <span className="avatar-monogram">JD</span>
        </div>
      )}
    </header>
  );
}
