import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessSet } from '@/components/chess/chess-set';
import { MatchPanel } from '@/components/chess/match-panel';
import { getApiMode } from '@/config/api';
import { ROUTES } from '@/config/routes';
import { VsTv, type PlayerPair } from '@/features/deliberation/components/vs-tv';
import type { FindPlayer, FoundPlayer } from '@/features/deliberation/types';
import { oneAtATime } from '@/features/deliberation/utils/one-at-a-time';
import { useIntro } from '@/hooks/use-intro';

/** Camera (0.7s), both players leaning in, the VS set dropping, powering on and tuning in. */
const INTRO_MS = 2500;
/** A VS set dropped again to change players starts falling straight away. */
const REDROP_AT = '.05s';
/** The player search allows one request a second (backend rate limit): the next lookup waits
 *  this long after the last one has answered. */
const SEARCH_GAP_MS = 1050;

const initial = (player: FoundPlayer | null) => (player ? player.username.charAt(0).toUpperCase() : '?');
const detail = (slot: string, player: FoundPlayer) => (player.title ? `${slot} · ${player.title}` : slot);

/**
 * Deliberation (player vs player), at /deliberation. The shot is a photograph of the match:
 * the table seen from beside it at a spectator's height, a player seated at each end leaning
 * in, the visitor's figure (ink, hat) as Player 1 and the guest (ivory, wearing Player 2's
 * picture once found) as Player 2. The VS set is lowered onto the stage floor beside the
 * table to take both players, each looked up with the player search (`findPlayer`); once
 * confirmed it is raised away, the camera reframes and the side panel shows the pairing.
 * For now the board is a preview, as the game engine is still to be built.
 */
export function DeliberationView({ findPlayer, leaving = false }: { findPlayer: FindPlayer; leaving?: boolean }) {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const intro = useIntro(root, INTRO_MS);
  const [players, setPlayers] = useState<PlayerPair | null>(null);
  const [lastPlayers, setLastPlayers] = useState<PlayerPair | null>(null);
  const [seated, setSeated] = useState<readonly [FoundPlayer | null, FoundPlayer | null]>([null, null]);
  const [round, setRound] = useState(0);
  const toMenu = useCallback(() => navigate(ROUTES.search), [navigate]);
  const confirm = useCallback((pair: PlayerPair) => {
    setPlayers(pair);
    setLastPlayers(pair);
  }, []);
  // Both slots may look players up at once: queue them so the API's limit is never hit.
  const lookUp = useMemo(() => oneAtATime(findPlayer, getApiMode() === 'live' ? SEARCH_GAP_MS : 0), [findPlayer]);

  const guest = players?.[1] ?? seated[1];
  return (
    <div
      ref={root}
      className="topdown-view deliberation"
      data-intro={intro.state}
      data-stage={players ? 'match' : 'choosing'}
      data-leaving={leaving || undefined}
      inert={leaving}
      onPointerDownCapture={intro.skip}
      onKeyDownCapture={intro.skip}
    >
      {/* TODO(engine): the board is a preview. Once the engine exists, start a game between
          `players` on Confirm and pass the position here as a FEN placement (`placement`). */}
      <ChessSet
        mode="deliberation"
        label={
          players
            ? `Board for ${players[0].username} (White) against ${players[1].username} (Black), starting position`
            : 'Chess board, starting position'
        }
        guest={{ face: initial(guest), avatar: guest?.avatar ?? null }}
        leaving={leaving}
        skipIntro={intro.skipped}
      />
      {players ? (
        <MatchPanel
          eyebrow="03 / Deliberation"
          title={`${players[0].username} vs ${players[1].username}`}
          seats={[
            { name: players[0].username, detail: detail('Player 1 · White', players[0]), color: 'white' },
            { name: players[1].username, detail: detail('Player 2 · Black', players[1]), color: 'black' },
          ]}
          note="Board preview: moves will work once the game engine is connected."
          leaving={leaving}
          delay=".3s"
          actions={
            <>
              <button
                type="button"
                className="panel-button panel-button--ghost"
                onClick={() => {
                  setPlayers(null);
                  setRound((count) => count + 1);
                }}
              >
                Change players
              </button>
              <button type="button" className="panel-button" onClick={toMenu}>Back to menu</button>
            </>
          }
        />
      ) : (
        <VsTv
          key={round}
          findPlayer={lookUp}
          initial={round === 0 ? null : lastPlayers}
          dropAt={round === 0 ? undefined : REDROP_AT}
          introDone={intro.done}
          leaving={leaving}
          onCancel={toMenu}
          onConfirm={confirm}
          onSeatsChange={setSeated}
        />
      )}
    </div>
  );
}
