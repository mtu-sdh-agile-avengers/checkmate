import { useState } from 'react';
import { BarChart3, Crown, Equal, TrendingUp, Trophy, X } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { RatingChart } from '@/components/ui/rating-chart';
import { StatCard } from '@/components/ui/stat-card';
import { TimeClassSelect } from '@/components/ui/time-class-select';
import { useOverall } from '@/features/overall-statistics/hooks/use-overall';
import type { OverallStats, TimeClass } from '@/types/chess';
import { formatRating } from '@/utils/format';

/** A rating that counts up, or "N/A" when there is none. */
const rating = (value: number | null) => (value === null ? formatRating(null) : <AnimatedNumber value={value} />);

/**
 * All-time panel of the single player view: the player's whole record in one time class
 * (Chess.com keeps records per time class). Live, it comes from the summary endpoint with
 * `period=all`; what that does not provide (peak date, average opponent, an all-time rating
 * graph) is left out rather than invented. The player is `username`, or the one in the URL.
 */
export function OverallPage({ username: player }: { username?: string }) {
  const params = useParams<{ username: string }>();
  const username = player ?? params.username ?? '';
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz');
  const { data, isPending, isFetching, error, refetch } = useOverall(username, timeClass);
  return (
    <div className="statistics-page overall-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">OVERALL / LONG-TERM PERFORMANCE</span>
          <h2>Overall statistics</h2>
          <p>{data ? covered(data) : 'Full account history'}</p>
        </div>
        <div className="summary-filters" aria-label="Overall statistics filters">
          <TimeClassSelect value={timeClass} onChange={setTimeClass} />
          <span className="label-pill">ALL TIME</span>
        </div>
      </div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data && data.games === 0 ? (
        <div className="status-screen" role="status"><p>{`No ${timeClass} games played yet.`}</p></div>
      ) : data ? (
        <div className="analytics-column" aria-busy={isFetching}>
          <div className="metric-grid metric-grid-four">
            <StatCard icon={BarChart3} label="Games" value={<AnimatedNumber value={data.games} />} />
            <StatCard icon={Crown} label="Wins" value={<AnimatedNumber value={data.wins} />} note={`${data.winRate}% win rate`} />
            <StatCard icon={Equal} label="Draws" value={<AnimatedNumber value={data.draws} />} />
            <StatCard icon={X} label="Losses" value={<AnimatedNumber value={data.losses} />} />
          </div>
          {/* The numbers first, together, so they can be read at a glance; the chart under them. */}
          <div className={`metric-grid ${data.averageOpponent === null ? 'metric-grid-two' : 'metric-grid-three'} rating-summary-grid`}>
            <StatCard icon={TrendingUp} label="Current rating" value={rating(data.currentRating)} note={data.currentRating === null ? `No rated ${timeClass} games` : undefined} />
            <StatCard icon={Trophy} label="Peak rating" value={rating(data.peakRating)} note={data.peakDate ?? undefined} />
            {data.averageOpponent !== null && (
              <StatCard icon={BarChart3} label="Average opponent" value={<AnimatedNumber value={data.averageOpponent} />} />
            )}
          </div>
          {data.ratingHistory.length > 0 ? (
            <Panel className="chart-panel overall-chart">
              <RatingChart points={data.ratingHistory} title="Rating progression" subtitle={`All available history · ${timeClass}`} />
            </Panel>
          ) : (
            <Panel className="chart-panel overall-chart overall-chart--empty">
              <p>Chess.com&apos;s all-time stats have no rating graph. The Recent channel charts up to the last 30 days.</p>
            </Panel>
          )}
        </div>
      ) : null}
    </div>
  );
}

function covered(data: OverallStats): string {
  return data.from ? `${data.from} – ${data.to}` : `Whole account, up to ${data.to}`;
}
