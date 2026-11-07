import { Suspense, lazy } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AppHeader } from '@/components/ui/app-header';
import { PageLoading } from '@/components/ui/page-status';

const SearchPage = lazy(() => import('@/features/player-search/components/search-page').then((m) => ({ default: m.SearchPage })));
const SummaryPage = lazy(() => import('@/features/summary-statistics/components/summary-page').then((m) => ({ default: m.SummaryPage })));
const OverallPage = lazy(() => import('@/features/overall-statistics/components/overall-page').then((m) => ({ default: m.OverallPage })));
const ProfilePage = lazy(() => import('@/features/player-profile/components/profile-page').then((m) => ({ default: m.ProfilePage })));

function AppLayout() {
  return (
    <div className="site-frame">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <AppHeader />
      <main id="main-content" className="main-content"><Outlet /></main>
      <footer className="app-footer"><span>CHECKMATE · SCHOLAR EDITION</span><span>Illustrative demo data — not live Chess.com records</span></footer>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoading label="Loading page…" />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<SearchPage />} />
          <Route path="players/:username">
            <Route index element={<ProfilePage />} />
            <Route path="summary" element={<SummaryPage />} />
            <Route path="overall" element={<OverallPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
