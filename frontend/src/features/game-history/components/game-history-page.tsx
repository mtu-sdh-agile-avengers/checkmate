import { useId, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { TimeClassSelect } from '@/components/ui/time-class-select';
import { useGameHistory } from '@/features/game-history/hooks/use-game-history';
import { compareMonths, nextMonth, previousMonth, sameMonth } from '@/features/game-history/utils/months';
import type { GameArchive, GameListItem, GamePageSize, GameResult, TimeClass } from '@/types/chess';
import { formatMonth, formatTimeClass } from '@/utils/format';
import './game-history-page.css';

const PAGE_SIZE: GamePageSize = 10;
const RESULTS: Record<GameResult, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };

/**
 * Games channel of the single player view (CMG4-54): the player's games of one month on
 * Chess.com, newest first, ten to a page. It opens on the latest month with games; the month
 * buttons step back to earlier months and forward again. Choosing a game calls `onOpen`, and
 * the player view shows that game (game-details) in place of the list.
 */
export function GameHistoryPage({ username, onOpen }: { username: string; onOpen: (game: GameListItem) => void }) {
  const [timeClass, setTimeClass] = useState<TimeClass | 'all'>('all');
  // The month on screen; undefined is the latest month with games (the API's default).
  const [month, setMonth] = useState<GameArchive>();
  const [page, setPage] = useState(1);
  const { data, isPending, isPlaceholderData, error, refetch } = useGameHistory(username, {
    archive: month,
    timeClass: timeClass === 'all' ? undefined : timeClass,
    pageSize: PAGE_SIZE,
    page,
  });

  // Which month is the latest is only known from an answer without a month: remember it, as
  // the month "Later month" stops at.
  const [latest, setLatest] = useState<GameArchive | null>(null);
  if (month === undefined && !isPlaceholderData && data?.archive && !sameMonth(data.archive, latest)) setLatest(data.archive);
  const shownMonth = month ?? latest;

  const showMonth = (next: GameArchive | undefined) => { setMonth(next); setPage(1); };
  const earlier = shownMonth ? () => showMonth(previousMonth(shownMonth)) : undefined;
  const later = month ? () => {
    const next = nextMonth(month);
    showMonth(latest && compareMonths(next, latest) >= 0 ? undefined : next);
  } : undefined;

  return (
    <div className="statistics-page game-history-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">GAMES / MATCH HISTORY</span>
          <h2 tabIndex={-1}>Recent games</h2>
          <p>{subtitle(data?.archive, data?.totalGames, timeClass)}</p>
        </div>
        <div className="summary-filters" aria-label="Game history filters">
          <MonthStepper label={shownMonth ? formatMonth(shownMonth) : 'Latest'} onEarlier={earlier} onLater={later} />
          <TimeClassSelect value={timeClass} onChange={(value) => { setTimeClass(value); setPage(1); }} allLabel="All" />
        </div>
      </div>
      {isPending ? <PageLoading label="Loading games…" /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data && data.items.length === 0 ? (
        <div className="status-screen" role="status"><p>{emptyMessage(data.archive, timeClass)}</p></div>
      ) : data ? (
        <div className="panel game-list-panel" aria-busy={isPlaceholderData}>
          <div className="game-list-head" aria-hidden="true">
            <span>Result</span><span>Opponent</span><span>Played as</span><span>Time control</span><span>Ended</span>
          </div>
          <ol className="game-list" aria-label={data.archive ? `Games of ${formatMonth(data.archive)}, newest first` : 'Games'}>
            {data.items.map((game, index) => (
              // --i staggers the rows tuning in.
              <li key={game.id} style={{ '--i': index } as CSSProperties}>
                <GameRow game={game} onOpen={() => onOpen(game)} />
              </li>
            ))}
          </ol>
          {data.totalPages > 1 && (
            <div className="game-pager">
              <button type="button" className="tv-button" aria-label="Newer games" onClick={() => setPage(page - 1)} disabled={page <= 1 || isPlaceholderData}>
                <ChevronLeft size={16} aria-hidden="true" /> Newer
              </button>
              <span>Page {data.page} of {data.totalPages}</span>
              <button type="button" className="tv-button" aria-label="Older games" onClick={() => setPage(page + 1)} disabled={!data.hasNext || isPlaceholderData}>
                Older <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** One game: result, opponent, the side the player had, time control and when it ended. */
function GameRow({ game, onOpen }: { game: GameListItem; onOpen: () => void }) {
  const result = RESULTS[game.result];
  const side = game.player.color === 'white' ? 'White' : 'Black';
  const format = `${formatTimeClass(game.timeClass)} · ${game.timeControl}`;
  return (
    <button
      type="button"
      className="game-row"
      data-game-id={game.id}
      onClick={onOpen}
      aria-label={`${result} against ${game.opponent.username} (${game.opponent.rating}) as ${side}, ${format}, ${game.dateTime}`}
    >
      <span className="game-result" data-result={game.result}>{result}</span>
      <span className="game-row__opponent"><b>{game.opponent.username}</b><span>{game.opponent.rating}</span></span>
      <span className="game-row__side"><i className="side-chip" data-color={game.player.color} />{side}</span>
      <span className="game-row__format">{format}</span>
      <span className="game-row__date">{game.dateTime}</span>
      <ChevronRight className="game-row__go" size={18} aria-hidden="true" />
    </button>
  );
}

/** Steps through the months of the player's archive. A missing handler disables its button. */
function MonthStepper({ label, onEarlier, onLater }: { label: string; onEarlier?: () => void; onLater?: () => void }) {
  const id = useId();
  return (
    <div className="filter-unit">
      <span className="filter-label" id={id}>Month</span>
      <div className="month-stepper" role="group" aria-labelledby={id}>
        <button type="button" onClick={onEarlier} disabled={!onEarlier} aria-label="Earlier month"><ChevronLeft size={17} aria-hidden="true" /></button>
        <span aria-live="polite">{label}</span>
        <button type="button" onClick={onLater} disabled={!onLater} aria-label="Later month"><ChevronRight size={17} aria-hidden="true" /></button>
      </div>
    </div>
  );
}

function subtitle(archive: GameArchive | null | undefined, total: number | undefined, timeClass: TimeClass | 'all'): string {
  if (archive === undefined || total === undefined) return 'The latest month on Chess.com';
  if (archive === null) return 'No games on Chess.com yet';
  const count = `${total} ${timeClass === 'all' ? '' : `${timeClass} `}${total === 1 ? 'game' : 'games'}`;
  return `${formatMonth(archive)} · ${count}`;
}

function emptyMessage(archive: GameArchive | null, timeClass: TimeClass | 'all'): string {
  if (archive === null) return 'No games on Chess.com yet.';
  return `No ${timeClass === 'all' ? '' : `${timeClass} `}games in ${formatMonth(archive)}.`;
}
