import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { RapidBoard, type RapidPiece } from '@/components/chess/rapid-board';
import { Tabletop, type TabletopPhase } from '@/components/chess/tabletop';
import { TopDownFigure } from '@/components/chess/top-down-figure';
import { getApiMode } from '@/config/api';
import { ROUTES } from '@/config/routes';
import { DeliberatingPanel } from '@/features/deliberation/components/deliberating-panel';
import { PhotoScene, type PhotoWinner } from '@/features/deliberation/components/photo-scene';
import { VerdictTv } from '@/features/deliberation/components/verdict-tv';
import { VsTv, type PlayerPair } from '@/features/deliberation/components/vs-tv';
import { DELIBERATION_SCENE, pieceToneOf, sceneStyle } from '@/features/deliberation/config/scene';
import { useRapidGames } from '@/features/deliberation/hooks/use-rapid-games';
import { useSceneQuality } from '@/features/deliberation/hooks/use-scene-quality';
import { useVerdictSequence } from '@/features/deliberation/hooks/use-verdict-sequence';
import type { ComparisonState, FindPlayer, FoundPlayer } from '@/features/deliberation/types';
import { oneAtATime } from '@/features/deliberation/utils/one-at-a-time';
import type { PlayedMove, Side } from '@/components/chess/board-pieces';
import { readVerdict } from '@/features/deliberation/utils/verdict';
import { useIntro } from '@/hooks/use-intro';
import type { TimeClass } from '@/types/chess';
import { afterMotion } from '@/utils/motion';
import './deliberation.css';

/** Camera (1.4s), both players leaning in, the VS set dropping, powering on and tuning in. */
const INTRO_MS = 3100;
/** A VS set dropped again to change players starts falling straight away. */
const REDROP_AT = '.05s';
/** The player search allows one request a second (backend rate limit); a little margin on top. */
const SEARCH_GAP_MS = 1100;
/** The verdict set is raised (vs-rise) before the VS set drops again. */
const RAISE_MS = 450;
const FILES = 'abcdefgh';

const initial = (player: FoundPlayer | null | undefined) => (player ? player.username.charAt(0).toUpperCase() : '?');
/** A side's pieces take the tone of the player playing it (config). */
const pieceTone = (side: Side) => pieceToneOf(side === 'white' ? DELIBERATION_SCENE.players.a : DELIBERATION_SCENE.players.b);

/**
 * Deliberation (player vs player), at /deliberation: who would win? The camera looks down at
 * the table, with Player A (White, ivory) seated at the near end and Player B (Black, ink) at
 * the far end, each wearing their picture. The scene runs in this order (`useVerdictSequence`;
 * times and colours in config/scene.ts):
 * 1. the VS set drops in to take both players (each looked up with `findPlayer`) and a time
 *    class; on Confirm it is raised and `onCompare` starts the comparison;
 * 2. while it runs, the board tips towards the viewer and the two play quick games, one after
 *    another (`useRapidGames`): each reaches for the piece they move, the pieces slide, hop and
 *    take; the panel beside them shows each step;
 * 3. the answer: a beat in which everything freezes, then the camera drops to table level and
 *    the scene becomes a photograph of the table under one spotlight (`PhotoScene`), the
 *    winner rising in it and the loser's king toppling on their end of the table; then the
 *    verdict set drops with the breakdown
 *    (`readVerdict`). If the comparison failed, the set says so instead.
 * "New comparison" raises the set and drops the VS set again with the same players. How much
 * of it plays depends on the device (`useSceneQuality`). The comparison itself is the app's.
 */
export function DeliberationView({ findPlayer, comparison, onCompare, onReset, leaving = false }: {
  findPlayer: FindPlayer;
  comparison: ComparisonState;
  onCompare: (player1: string, player2: string, timeClass: TimeClass) => void;
  onReset: () => void;
  leaving?: boolean;
}) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const intro = useIntro(root, INTRO_MS);
  const [players, setPlayers] = useState<PlayerPair | null>(null);
  const [lastPlayers, setLastPlayers] = useState<PlayerPair | null>(null);
  const [seated, setSeated] = useState<readonly [FoundPlayer | null, FoundPlayer | null]>([null, null]);
  const [round, setRound] = useState(0);
  const [timeClass, setTimeClass] = useState<TimeClass>('blitz');
  const [closing, setClosing] = useState(false);
  const { scene, step, progress } = useVerdictSequence(players !== null, comparison.status);
  const quality = useSceneQuality(scene === 'deliberating');
  const { timing } = DELIBERATION_SCENE;
  const table = useRapidGames(scene === 'deliberating', quality === 'lite' ? timing.plyMsLite : timing.plyMs, quality === 'still');
  const verdict = useMemo(() => (comparison.status === 'success' ? readVerdict(comparison.comparison) : null), [comparison]);

  const toMenu = useCallback(() => navigate(ROUTES.search), [navigate]);
  const confirm = useCallback(
    (pair: PlayerPair) => {
      setPlayers(pair);
      setLastPlayers(pair);
      onCompare(pair[0].username, pair[1].username, timeClass);
    },
    [onCompare, timeClass],
  );
  const startOver = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setPlayers(null);
      setRound((count) => count + 1);
      onReset();
    }, afterMotion(RAISE_MS));
  };
  // Both slots may look players up at once: queue them so the API's limit is never hit.
  const lookUp = useMemo(() => oneAtATime(findPlayer, getApiMode() === 'live' ? SEARCH_GAP_MS : 0), [findPlayer]);

  const playerA = players?.[0] ?? seated[0];
  const playerB = players?.[1] ?? seated[1];
  const resolved = (scene === 'revealing' || scene === 'verdict') && verdict !== null && players !== null;
  const phase: TabletopPhase | null = resolved ? 'resolve' : scene === 'deliberating' && quality !== 'still' ? 'rapid' : null;
  const winner: PhotoWinner = verdict?.winner === 'player1' ? 'a' : verdict?.winner === 'player2' ? 'b' : null;
  const pieces = useMemo<RapidPiece[]>(
    () => table.pieces.map(({ id, kind, side, square, taken }) => ({ id, kind, tone: pieceTone(side), square, taken })),
    [table.pieces],
  );
  const move = scene === 'deliberating' ? table.move : null;
  const announcement =
    scene === 'verdict' && verdict
      ? verdict.summary
      : scene === 'failed' && comparison.status === 'error'
        ? `The players could not be compared. ${comparison.message}`
        : '';

  return (
    <div
      ref={root}
      className="topdown-view deliberation"
      data-intro={intro.state}
      data-scene={scene}
      data-quality={quality}
      data-leaving={leaving || undefined}
      inert={leaving}
      onPointerDownCapture={intro.skip}
      onKeyDownCapture={intro.skip}
      style={sceneStyle(quality)}
    >
      <Tabletop
        mode="deliberation"
        leaving={leaving}
        phase={phase}
        near={(
          <SeatActor reach={reachFor(move, table.moves, 'white')}>
            <TopDownFigure tone={DELIBERATION_SCENE.players.a.tone} face={initial(playerA)} avatar={playerA?.avatar} />
          </SeatActor>
        )}
        far={(
          <SeatActor reach={reachFor(move, table.moves, 'black')}>
            <TopDownFigure tone={DELIBERATION_SCENE.players.b.tone} face={initial(playerB)} avatar={playerB?.avatar} />
          </SeatActor>
        )}
      >
        {/* TODO(engine): while the players are compared they play famous short games; once the
            engine exists, a real game between `players` can be played here instead. */}
        <RapidBoard
          pieces={pieces}
          hop={move ? { id: move.id, count: table.moves } : null}
          label={players ? `Board for ${players[0].username} (White) against ${players[1].username} (Black)` : 'Chess board, starting position'}
        />
      </Tabletop>
      {resolved && <PhotoScene players={players} winner={winner} quality={quality} leaving={leaving} />}
      {scene === 'choosing' && (
        <VsTv
          key={round}
          findPlayer={lookUp}
          initial={round === 0 ? null : lastPlayers}
          dropAt={round === 0 ? undefined : REDROP_AT}
          introDone={intro.done}
          leaving={leaving}
          timeClass={timeClass}
          onTimeClassChange={setTimeClass}
          onCancel={toMenu}
          onConfirm={confirm}
          onSeatsChange={setSeated}
        />
      )}
      {scene === 'deliberating' && players && (
        <DeliberatingPanel players={players} timeClass={timeClass} step={step} progress={progress} leaving={leaving} />
      )}
      {scene === 'verdict' && verdict && (
        <VerdictTv timeClass={timeClass} verdict={verdict} leaving={leaving || closing} onNew={startOver} onMenu={toMenu} />
      )}
      {scene === 'failed' && comparison.status === 'error' && (
        <VerdictTv
          timeClass={timeClass}
          failure={{ message: comparison.message, retry: comparison.retry }}
          leaving={leaving || closing}
          onNew={startOver}
          onMenu={toMenu}
        />
      )}
      {/* The verdict, read out when it is in (the verdict set's title also takes focus). */}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}

type Reach = { hand: 'left' | 'right'; x: number; count: number };

/**
 * How the player on `seat` reaches for the piece just moved, if it was theirs: with the hand
 * on that side of them, and how far across (-1 to 1 in their own frame). The far player
 * faces the other way, so their left is the board's right.
 */
function reachFor(move: PlayedMove | null, count: number, seat: Side): Reach | null {
  if (!move || move.side !== seat) return null;
  const across = (FILES.indexOf(move.to.charAt(0)) - 3.5) / 3.5; // -1 (a-file) to 1 (h-file), as the board is drawn
  if (seat === 'white') return { hand: across < 0 ? 'left' : 'right', x: across, count };
  return { hand: across > 0 ? 'left' : 'right', x: -across, count };
}

/** A seated figure, wrapped so the stylesheet can play its reach (deliberation.css). */
function SeatActor({ reach, children }: { reach: Reach | null; children: ReactNode }) {
  return (
    <span
      className="seat-actor"
      data-reach={reach?.hand}
      data-beat={reach ? (reach.count % 2 === 0 ? 'a' : 'b') : undefined}
      style={reach ? ({ '--reach-x': reach.x.toFixed(2) } as CSSProperties) : undefined}
    >
      {children}
    </span>
  );
}
