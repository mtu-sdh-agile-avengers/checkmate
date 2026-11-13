import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatsTv, type TvChannel } from '@/components/chess/stats-tv';
import { ROUTES } from '@/config/routes';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { ProfilePage } from '@/features/player-profile/components/profile-page';
import { SummaryPage } from '@/features/summary-statistics/components/summary-page';

type StatsChannel = 'recent' | 'overall';
const CHANNELS: readonly TvChannel<StatsChannel>[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'overall', label: 'Overall' },
];

/**
 * The single player view: profile and both sets of statistics on the television beside the
 * opponent's seat. The channel lives in the URL (`?stats=overall`), so old /overall links
 * and the browser's back button keep working.
 */
export function PlayerView({ username }: { username: string }) {
  const [params, setParams] = useSearchParams();
  const channel: StatsChannel = params.get('stats') === 'overall' ? 'overall' : 'recent';
  // The overall panel is mounted on its first visit and then kept, like the recent one,
  // so switching back and forth does not refetch or reset the filters.
  const [overallOpened, setOverallOpened] = useState(channel === 'overall');
  if (channel === 'overall' && !overallOpened) setOverallOpened(true);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  return (
    <>
      <Link className="stage-back" to={ROUTES.search}><ArrowLeft size={18} aria-hidden="true" /> Back to search</Link>
      <section className="player-set" aria-labelledby="player-view-title">
        <h1 id="player-view-title" className="sr-only" tabIndex={-1} ref={heading}>Player {username}</h1>
        <StatsTv
          label="Statistics on the television"
          channels={CHANNELS}
          channel={channel}
          onChannel={(next) => setParams(next === 'overall' ? { stats: 'overall' } : {}, { replace: true })}
          side={<ProfilePage />}
        >
          <div hidden={channel !== 'recent'}><SummaryPage /></div>
          {overallOpened && <div hidden={channel !== 'overall'}><OverallPage /></div>}
        </StatsTv>
      </section>
    </>
  );
}
