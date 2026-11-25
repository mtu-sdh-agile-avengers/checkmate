import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { StatsTv, type TvChannel } from '@/components/chess/stats-tv';
import { ROUTES } from '@/config/routes';
import { GameDetailsPage } from '@/features/game-details/components/game-details-page';
import { GameHistoryPage } from '@/features/game-history/components/game-history-page';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { ProfilePage } from '@/features/player-profile/components/profile-page';
import { SummaryPage } from '@/features/summary-statistics/components/summary-page';
import type { GameArchive, GameListItem } from '@/types/chess';

type StatsChannel = 'recent' | 'overall' | 'games';
const CHANNELS: readonly TvChannel<StatsChannel>[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'overall', label: 'Overall' },
  { id: 'games', label: 'Games' },
];

/** A game opened on the Games channel, and the archive month it is in (when known). */
type OpenGame = { id: string; archive?: GameArchive };

/**
 * The single player view: profile and statistics on the television beside the opponent's
 * seat. The channel lives in the URL (`?stats=overall`, `?stats=games`), and so does a game
 * opened on the Games channel (`?stats=games&game=<id>&month=2026-10`), so old /overall
 * links, links to a game and the browser's back button keep working.
 *
 * `leaving`: the visitor has gone back to the search and the camera is panning away. The set
 * keeps its player, channel and game while it goes, and is hidden from assistive technology.
 */
export function PlayerView({ username, leaving = false }: { username: string; leaving?: boolean }) {
  const [params, setParams] = useSearchParams();
  const requested = readChannel(params);
  const requestedGame = requested === 'games' ? readGame(params) : null;
  const [channel, setChannel] = useState(requested);
  const [game, setGame] = useState(requestedGame);
  if (!leaving && channel !== requested) setChannel(requested);
  if (!leaving && !sameGame(game, requestedGame)) setGame(requestedGame);
  // The overall panel and the game list are mounted on their first visit and then kept, like
  // the recent panel, so switching back and forth does not refetch or reset their filters.
  const [overallOpened, setOverallOpened] = useState(channel === 'overall');
  if (channel === 'overall' && !overallOpened) setOverallOpened(true);
  const showList = channel === 'games' && game === null;
  const [listOpened, setListOpened] = useState(showList);
  if (showList && !listOpened) setListOpened(true);

  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);

  // Back from a game to the list: focus returns to that game's row (or the list's heading).
  const list = useRef<HTMLDivElement>(null);
  const returnTo = useRef<string | null>(null);
  useEffect(() => {
    const id = returnTo.current;
    if (game !== null || id === null || !list.current) return;
    returnTo.current = null;
    const rows = list.current.querySelectorAll<HTMLElement>('[data-game-id]');
    const row = Array.from(rows).find((element) => element.dataset.gameId === id);
    (row ?? list.current.querySelector<HTMLElement>('h2'))?.focus();
  }, [game]);

  const showChannel = (next: StatsChannel) => setParams(next === 'recent' ? {} : { stats: next }, { replace: true });
  const openGame = ({ id, archive }: GameListItem) => setParams({ stats: 'games', game: id, month: monthParam(archive) }, { replace: true });
  const closeGame = () => {
    returnTo.current = game?.id ?? null;
    setParams({ stats: 'games' }, { replace: true });
  };

  return (
    <div className="player-view" data-leaving={leaving || undefined} inert={leaving} aria-hidden={leaving || undefined}>
      <Link className="stage-back" to={ROUTES.search}><ArrowLeft size={18} aria-hidden="true" /> Back to search</Link>
      <section className="player-set" aria-labelledby="player-view-title">
        <h1 id="player-view-title" className="sr-only" tabIndex={-1} ref={heading}>Player {username}</h1>
        <StatsTv
          label="Statistics on the television"
          channels={CHANNELS}
          channel={channel}
          // Opening a game, or going back to the list, flickers like a change of channel.
          scene={game?.id}
          onChannel={showChannel}
          side={<ProfilePage username={username} />}
        >
          <div hidden={channel !== 'recent'}><SummaryPage username={username} /></div>
          {overallOpened && <div hidden={channel !== 'overall'}><OverallPage username={username} /></div>}
          {listOpened && <div hidden={!showList} ref={list}><GameHistoryPage username={username} onOpen={openGame} /></div>}
          {channel === 'games' && game && (
            <div><GameDetailsPage key={game.id} username={username} gameId={game.id} archive={game.archive} onBack={closeGame} /></div>
          )}
        </StatsTv>
      </section>
    </div>
  );
}

function readChannel(params: URLSearchParams): StatsChannel {
  const stats = params.get('stats');
  return stats === 'overall' || stats === 'games' ? stats : 'recent';
}

function readGame(params: URLSearchParams): OpenGame | null {
  const id = params.get('game');
  if (!id) return null;
  const month = /^(\d{4})-(\d{2})$/.exec(params.get('month') ?? '');
  return month ? { id, archive: { year: Number(month[1]), month: Number(month[2]) } } : { id };
}

/** An archive month as it goes in the URL: "2026-10". */
const monthParam = ({ year, month }: GameArchive) => `${year}-${String(month).padStart(2, '0')}`;

const sameGame = (a: OpenGame | null, b: OpenGame | null) =>
  a?.id === b?.id && a?.archive?.year === b?.archive?.year && a?.archive?.month === b?.archive?.month;
