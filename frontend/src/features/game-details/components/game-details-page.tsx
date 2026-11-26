import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { TopDownBoard } from '@/components/chess/top-down-board';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { useGame } from '@/features/game-details/hooks/use-game';
import { readOpening, readPgn, toFullMoves } from '@/features/game-details/utils/read-pgn';
import type { GameArchive, GameDetails, GamePlayer, GameResult, PlayerColor } from '@/types/chess';
import { formatNumber, formatTimeClass, formatUtc } from '@/utils/format';
import './game-details-page.css';

const RESULTS: Record<GameResult, string> = { win: 'Win', loss: 'Loss', draw: 'Draw' };

/**
 * One game on the Games channel of the single player view (CMG4-17): who played whom, how it
 * ended, the final position and the moves, from the game details endpoint. `archive` is the
 * month the game is in (every row of the game history list has it), so the backend looks in
 * the right monthly archive. `onBack` returns to the list.
 */
export function GameDetailsPage({ username, gameId, archive, onBack }: {
  username: string;
  gameId: string;
  archive?: GameArchive;
  onBack: () => void;
}) {
  const { data, isPending, error, refetch } = useGame(username, gameId, archive);
  // Keyboard and screen reader users land on the game when the picture changes to it.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, []);
  const [white, black] = data ? sides(data) : [null, null];

  return (
    <div className="statistics-page game-details-page">
      <div className="page-title-row">
        <div>
          <span className="eyebrow">{data ? `GAME / ${data.date.toUpperCase()}` : 'GAME'}</span>
          <h2 ref={heading} tabIndex={-1}>{white && black ? `${white.username} vs ${black.username}` : 'Game details'}</h2>
          <p>{data ? `${formatTimeClass(data.timeClass)} · ${data.timeControl} · ${data.rated ? 'Rated' : 'Casual'}` : 'From the Chess.com archive'}</p>
        </div>
        <div className="game-details__actions">
          <button type="button" className="tv-button" onClick={onBack}><ArrowLeft size={16} aria-hidden="true" /> All games</button>
          {data && (
            <a className="tv-button" href={data.url} target="_blank" rel="noreferrer">
              View on Chess.com <ExternalLink size={15} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
      {isPending ? <PageLoading label="Loading game…" /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : data ? <GameBody game={data} /> : null}
    </div>
  );
}

function GameBody({ game }: { game: GameDetails }) {
  const pgn = useMemo(() => readPgn(game.pgn), [game.pgn]);
  const moves = toFullMoves(pgn);
  const opening = readOpening(pgn.tags);
  const [white, black] = sides(game);
  const variant = game.rules === 'chess' ? null : game.rules === 'chess960' ? 'Chess960' : game.rules;

  return (
    <div className="game-details__body">
      <figure className="game-details__board">
        {/* Seen from the player's side of the board. */}
        <TopDownBoard placement={game.finalFen} orientation={game.player.color} label={`Final position, ${game.player.username} playing ${game.player.color}`} />
        <figcaption>Final position · {moves.length} {moves.length === 1 ? 'move' : 'moves'}</figcaption>
      </figure>
      <div className="game-details__info">
        <Panel className="game-players">
          <PlayerLine color="white" side={white} outcome={outcomeOf(game, 'white')} />
          <PlayerLine color="black" side={black} outcome={outcomeOf(game, 'black')} />
        </Panel>
        <dl className="game-facts">
          <div className="game-facts__wide"><dt>Outcome</dt><dd>{pgn.tags.Termination ?? `${RESULTS[game.result]} for ${game.player.username}`}</dd></div>
          <div><dt>Ended</dt><dd>{formatUtc(game.endTime)}</dd></div>
          <div><dt>Average rating</dt><dd>{formatNumber(Math.round(game.averageRating))}</dd></div>
          {opening && <div className="game-facts__wide"><dt>Opening</dt><dd>{opening}</dd></div>}
          {variant && <div><dt>Variant</dt><dd>{variant}</dd></div>}
        </dl>
        <Panel className="move-panel">
          <h3>Moves</h3>
          {moves.length === 0 ? <p className="move-panel__none">No moves were played.</p> : (
            <ol className="move-list">
              {moves.map(({ number, white: whiteMove, black: blackMove }) => (
                <li key={number}><span className="move-list__number">{number}.</span><span>{whiteMove ?? '…'}</span><span>{blackMove ?? ''}</span></li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}

const SCORES: Record<GameResult, { score: string; words: string }> = {
  win: { score: '1', words: 'won' },
  loss: { score: '0', words: 'lost' },
  draw: { score: '½', words: 'drew' },
};

/** One side of the board: colour, name, rating and score (1, 0 or ½). */
function PlayerLine({ color, side, outcome }: { color: PlayerColor; side: GamePlayer; outcome: GameResult }) {
  const { score, words } = SCORES[outcome];
  return (
    <div className="game-player">
      <i className="side-chip" data-color={color} aria-hidden="true" />
      <span className="game-player__name"><span className="sr-only">{color === 'white' ? 'White' : 'Black'}: </span>{side.username}</span>
      <span className="game-player__rating">{side.rating}</span>
      <span className="game-player__score"><span aria-hidden="true">{score}</span><span className="sr-only">, {words}</span></span>
    </div>
  );
}

/** White first, then Black. */
function sides(game: GameDetails): [GamePlayer, GamePlayer] {
  return game.player.color === 'white' ? [game.player, game.opponent] : [game.opponent, game.player];
}

/** The game's result for the side playing `color` (`result` is the player's). */
function outcomeOf(game: GameDetails, color: PlayerColor): GameResult {
  if (game.player.color === color || game.result === 'draw') return game.result;
  return game.result === 'win' ? 'loss' : 'win';
}
