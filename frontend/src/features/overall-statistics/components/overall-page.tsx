import { BarChart3, Crown, Equal, Trophy, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getApiMode } from '@/config/api';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { RatingChart } from '@/components/ui/rating-chart';
import { StatCard } from '@/components/ui/stat-card';
import { useOverall } from '@/features/overall-statistics/hooks/use-overall';
import { formatNumber } from '@/utils/format';

export function OverallPage() {
  const { username = '' } = useParams<{ username: string }>();
  const { data, isPending, error, refetch } = useOverall(username);
  return (
    <div className="statistics-page overall-page">
      <div className="page-title-row"><div><span className="eyebrow">03 / LONG-TERM PERFORMANCE</span><h1>Overall statistics</h1><p>{data ? `${data.from} – ${data.to}` : 'Full account history'}</p>{getApiMode() === 'live' && <p className="empty-copy" role="note">Demo data — this page is not connected to the API yet.</p>}</div><span className="label-pill">ALL TIME</span></div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data ? (
        <div className="statistics-layout">
          <div className="board-column"><ChessArtwork variant="endgame" /><p className="illustration-label">Finished-game visualisation · sample position</p></div>
          <div className="analytics-column">
            <div className="metric-grid metric-grid-four">
              <StatCard icon={BarChart3} label="Games" value={formatNumber(data.games)} />
              <StatCard icon={Crown} label="Wins" value={formatNumber(data.wins)} note={`${data.winRate}% win rate`} />
              <StatCard icon={Equal} label="Draws" value={formatNumber(data.draws)} />
              <StatCard icon={X} label="Losses" value={formatNumber(data.losses)} />
            </div>
            <Panel className="chart-panel overall-chart"><RatingChart points={data.ratingHistory} title="Rating progression" subtitle="All available sample history" /></Panel>
            <div className="metric-grid metric-grid-two">
              <StatCard icon={Trophy} label="Peak rating" value={formatNumber(data.peakRating)} note={data.peakDate} />
              <StatCard icon={BarChart3} label="Average opponent" value={formatNumber(data.averageOpponent)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
