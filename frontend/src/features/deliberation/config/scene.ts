import type { CSSProperties } from 'react';
import type { PieceTone } from '@/components/chess/stage-art';

/** A player's look: the tone of their pieces, figure and half of the VS set, and their side. */
export type PlayerLook = { tone: 'ivory' | 'ink'; side: 'white' | 'black' };

/** Player A plays White from the near seat, Player B Black from the far seat. A player's
 *  pieces, figure and half of the VS set share one tone, so they read as one person. */
const PLAYERS: { a: PlayerLook; b: PlayerLook } = {
  a: { tone: 'ivory', side: 'white' },
  b: { tone: 'ink', side: 'black' },
};

/**
 * Everything that sets the pace and the look of Deliberation's scene, in one place: how fast
 * the games at the table go, how long each beat of the resolution lasts, the camera's angles,
 * each player's tone, and when the scene drops to a lighter quality. The stylesheets read the
 * timings and angles through custom properties (`sceneStyle`), so a change here moves both
 * the script and the CSS.
 *
 * Timeline, from the moment the comparison answers (the table in docs/front/front-desc.md):
 * the beat (beatMs), the camera's drop to table level (descendMs, starting after the beat),
 * the spotlight (spotlightAtMs), the loser's king falling (kingAtMs), the verdict set's drop
 * (revealMs).
 */
export const DELIBERATION_SCENE = {
  players: PLAYERS,
  timing: {
    /** One move of the games at the table. */
    plyMs: 330,
    /** The same, on a device that cannot keep up (quality 'lite'). */
    plyMsLite: 560,
    /** A status step the comparison cannot report (see use-verdict-sequence). */
    stepMs: 900,
    /** Everything freezes before the camera moves: the dramatic beat. */
    beatMs: 650,
    /** The camera tips down from overhead to table level, after the beat. */
    descendMs: 1400,
    /** From the start of the resolution: the spotlight comes up on the winner... */
    spotlightAtMs: 1900,
    /** ...the loser's king falls... */
    kingAtMs: 2250,
    /** ...and the verdict set starts to drop. */
    revealMs: 2750,
  },
  camera: {
    /** While the games run, the board tips towards the viewer... */
    rapidTiltDeg: 16,
    /** ...and sways, to give the games speed. */
    swayDeg: 1.4,
    swayMs: 3800,
    /** How far the camera tips towards table level before the cut to the photograph. */
    descendTiltDeg: 70,
  },
  quality: {
    /** At most this many CPU cores, or this much memory (where the browser says): lighter scene. */
    liteCores: 2,
    liteMemoryGb: 2,
    /** Measured below this many frames a second while the games run: lighter scene. */
    liteFps: 45,
    probeMs: 1200,
    /** Specks of dust floating in the spotlight's beam. */
    dust: { full: 9, lite: 0 },
  },
} as const;

/** The pieces' art for a player's tone: ivory, or ebony for ink. */
export const pieceToneOf = ({ tone }: PlayerLook): PieceTone => (tone === 'ink' ? 'ebony' : 'ivory');

/** How much of the scene plays: everything, a lighter version, or nothing that moves. */
export type SceneQuality = 'full' | 'lite' | 'still';

/** The config's timings and angles as custom properties, for the stylesheets. */
export function sceneStyle(quality: SceneQuality): CSSProperties {
  const { timing, camera } = DELIBERATION_SCENE;
  return {
    '--ply-ms': `${quality === 'lite' ? timing.plyMsLite : timing.plyMs}ms`,
    '--beat-ms': `${timing.beatMs}ms`,
    '--descend-ms': `${timing.descendMs}ms`,
    '--spot-at': `${timing.spotlightAtMs}ms`,
    '--king-at': `${timing.kingAtMs}ms`,
    '--rapid-tilt': `${camera.rapidTiltDeg}deg`,
    '--sway': `${camera.swayDeg}deg`,
    '--sway-ms': `${camera.swayMs}ms`,
    '--descend-tilt': `${camera.descendTiltDeg}deg`,
  } as CSSProperties;
}
