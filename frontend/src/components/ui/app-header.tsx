import { BarChart3, Crown, Search, TrendingUp, UserRound } from 'lucide-react';
import { NavLink, useParams } from 'react-router-dom';
import { getApiMode } from '@/config/api';
import { APP_NAME, DEMO_USERNAME } from '@/config/constants';
import { ROUTES } from '@/config/routes';

export function AppHeader() {
  const { username = DEMO_USERNAME } = useParams<{ username: string }>();
  const links = [
    { label: 'Search', path: ROUTES.search, icon: Search, end: true },
    { label: 'Statistics', path: ROUTES.summary(username), icon: BarChart3, end: false },
    { label: 'Overall', path: ROUTES.overall(username), icon: TrendingUp, end: false },
    { label: 'Profile', path: ROUTES.profile(username), icon: UserRound, end: true },
  ];
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
