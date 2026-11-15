import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/ui/app-header';
import { getApiMode } from '@/config/api';
import { ROUTES } from '@/config/routes';
import { PageLoading } from '@/components/ui/page-status';

const StageLayout = lazy(() => import('@/app/stage-layout').then((m) => ({ default: m.StageLayout })));

function AppLayout() {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppHeader />
      <main id="main-content" className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>CHECKMATE · SCHOLAR EDITION</span><span>{getApiMode() === 'live' ? 'Profile and statistics from the Chess.com Public API' : 'Illustrative demo data — not live Chess.com records'}</span></footer>
    </div>
  );
}

/** The statistics pages were merged into the player view; old links land on its television. */
function ToPlayerView({ stats }: { stats?: 'overall' }) {
  const { username = '' } = useParams<{ username: string }>();
  return <Navigate to={`${ROUTES.profile(username)}${stats ? `?stats=${stats}` : ''}`} replace />;
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoading label="Loading page…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* One layout for search and player view, so the stage stays mounted and the camera can move between them. */}
          <Route element={<StageLayout />}>
            <Route index element={null} />
            <Route path="players/:username" element={null} />
          </Route>
          <Route path="players/:username/summary" element={<ToPlayerView />} />
          <Route path="players/:username/overall" element={<ToPlayerView stats="overall" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
