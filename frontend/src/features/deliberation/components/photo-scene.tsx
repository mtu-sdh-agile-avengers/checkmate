import type { CSSProperties } from 'react';
import { PieceArt, SeatedFigure } from '@/components/chess/stage-art';
import type { PlayerPair } from '@/features/deliberation/components/vs-tv';
import { DELIBERATION_SCENE, pieceToneOf, type SceneQuality } from '@/features/deliberation/config/scene';
import './photo-scene.css';

/** Which player won: A (Player 1, White, the left seat) or B (Player 2, Black, the right seat). */
export type PhotoWinner = 'a' | 'b' | null;

const initial = (name: string) => name.charAt(0).toUpperCase();

/**
 * The resolution of Deliberation, shot like a photograph: the camera has come down from above
 * the board to the height of the table and looks up at the winner, seated in profile at their
 * end of the table (Player A on the left, Player B on the right, each in their tone and with
 * their picture). A spotlight beam falls on the winner and the rest of the frame goes dark;
 * the loser's king topples on the loser's end of the table, where it stays in frame. With no
 * winner, both stay seated and the light falls on the table between them.
 *
 * Built from the landing page's own cut-outs and stage treatment (photo-scene.css): the dark
 * back wall, the chessboard floor in perspective, haze, a blurred beam with drifting dust.
 * Decorative: the verdict set says the result in words.
 */
export function PhotoScene({ players, winner, quality }: { players: PlayerPair; winner: PhotoWinner; quality: SceneQuality }) {
  const [a, b] = players;
  const dust = quality === 'full' ? DELIBERATION_SCENE.quality.dust.full : DELIBERATION_SCENE.quality.dust.lite;
  const { a: lookA, b: lookB } = DELIBERATION_SCENE.players;
  return (
    <div className="photo-scene" data-winner={winner ?? 'none'} data-quality={quality} aria-hidden="true">
      <div className="photo-scene__backdrop" />
      <div className="photo-scene__frame">
        <div className="photo-set">
          <div className="photo-set__seat photo-set__seat--a">
            <SeatedFigure tone={lookA.tone} avatar={a.avatar} face={initial(a.username)} facing="right" />
          </div>
          <div className="photo-set__seat photo-set__seat--b">
            <SeatedFigure tone={lookB.tone} avatar={b.avatar} face={initial(b.username)} facing="left" />
          </div>
          <div className="photo-set__table">
            {/* Each player's king at their end of the board; the loser's falls (photo-scene.css). */}
            <span className="photo-set__king photo-set__king--a"><PieceArt kind="king" tone={pieceToneOf(lookA)} /></span>
            <span className="photo-set__king photo-set__king--b"><PieceArt kind="king" tone={pieceToneOf(lookB)} /></span>
            <span className="photo-set__piece photo-set__piece--a"><PieceArt kind="pawn" tone={pieceToneOf(lookA)} /></span>
            <span className="photo-set__piece photo-set__piece--b"><PieceArt kind="knight" tone={pieceToneOf(lookB)} /></span>
            <div className="photo-set__board" />
            <div className="photo-set__top" />
            <div className="photo-set__front" />
          </div>
        </div>
        <div className="photo-scene__dim" />
        <div className="photo-scene__beam">
          {Array.from({ length: dust }, (_, index) => (
            <i key={index} className="photo-scene__dust" style={{ '--i': index } as CSSProperties} />
          ))}
        </div>
      </div>
    </div>
  );
}
