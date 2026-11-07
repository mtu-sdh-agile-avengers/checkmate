import { useState } from 'react';
import { BarChart3, Crown, Equal, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { RatingChart } from '@/components/ui/rating-chart';
import { StatCard } from '@/components/ui/stat-card';
import { SummaryFilters } from '@/features/summary-statistics/components/summary-filters';
import { useSummary } from '@/features/summary-statistics/hooks/use-summary';
import type { TimeClass, TimeFrame } from '@/types/chess';
import { formatNumber, signedNumber } from '@/utils/format';

export function SummaryPage() {
  const { username = '' } = useParams<{ username: string }>();
  const [frame, setFrame] = useState<TimeFrame>('30');
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz');
  const { data, isPending, isFetching, error, refetch } = useSummary(username, frame, timeClass);

  return (
    <div className="statistics-page">
      <div className="page-title-row">
        <div><span className="eyebrow">02 / CHESS PERFORMANCE</span><h1>Summary statistics</h1><p>{data ? `${data.from} – ${data.to}` : 'Select a period to analyse'}</p></div>
        <SummaryFilters frame={frame} timeClass={timeClass} onFrameChange={setFrame} onClassChange={setTimeClass} />
      </div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data ? (
        <div className="statistics-layout" aria-busy={isFetching}>
          <div className="board-column"><ChessArtwork variant="midgame" /><p className="illustration-label">Mid-game visualisation · {timeClass} {isFetching ? '· Updating…' : ''}</p></div>
          <div className="analytics-column">
            <div className="metric-grid metric-grid-four">
              <StatCard icon={BarChart3} label="Games played" value={formatNumber(data.games)} />
              <StatCard icon={Crown} label="Wins" value={formatNumber(data.wins)} />
              <StatCard icon={Equal} label="Draws" value={formatNumber(data.draws)} />
              <StatCard icon={X} label="Losses" value={formatNumber(data.losses)} />
            </div>
            <Panel className="summary-rate-panel">
              <div className="result-rate"><strong>Win rate</strong><strong>{data.winRate}%</strong></div>
              <div className="outcome-bar" aria-label={`${data.wins} wins, ${data.draws} draws, ${data.losses} losses`}>
                <span style={{ width: `${(data.wins / data.games) * 100}%` }} />
                <span style={{ width: `${(data.draws / data.games) * 100}%` }} />
                <span style={{ width: `${(data.losses / data.games) * 100}%` }} />
              </div>
            </Panel>
            <div className="metric-grid metric-grid-three rating-summary-grid">
              <StatCard label="Expected rating" value={formatNumber(data.expectedRating)} />
              <StatCard label="Actual rating" value={formatNumber(data.actualRating)} note={`Last change ${signedNumber(data.lastChange)} Elo`} />
              <StatCard label="Rating difference" value={`${signedNumber(data.difference)} Elo`} />
            </div>
            <Panel className="chart-panel"><RatingChart points={data.ratingHistory} subtitle={`Last ${frame === 'all' ? 'available' : `${frame} days`} · ${timeClass}`} /></Panel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
