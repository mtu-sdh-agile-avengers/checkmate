/* Camera arithmetic for the 3D set, kept free of three.js so it can be tested on its own. */

export type Vec3 = readonly [number, number, number];

/** Where a camera at `distance` from `target` sits, looking at it from `elevation` above the
 *  board's plane and `azimuth` round from White's side (+z) towards the h-file (+x), radians. */
export function orbitPosition(target: Vec3, elevation: number, azimuth: number, distance: number): Vec3 {
  const flat = Math.cos(elevation) * distance;
  return [target[0] + flat * Math.sin(azimuth), target[1] + Math.sin(elevation) * distance, target[2] + flat * Math.cos(azimuth)];
}

/**
 * How far a camera with vertical field of view `fovDegrees` must stand for a sphere of
 * `radius` to fit a band `bandWidth` pixels wide in a picture `height` pixels tall.
 */
export function fitDistance(radius: number, fovDegrees: number, bandWidth: number, height: number): number {
  const vertical = (fovDegrees * Math.PI) / 360;
  const horizontal = Math.atan((Math.tan(vertical) * Math.max(1, bandWidth)) / Math.max(1, height));
  return radius / Math.sin(Math.min(vertical, horizontal));
}

/**
 * A lens shift that puts the middle of the picture at `centerX` (pixels from the left)
 * instead of the canvas middle, without turning the camera: the canvas shows a `width`-wide
 * window, starting at `offsetX`, of a picture `fullWidth` wide. Used to frame the set in the
 * part of the stage that the side panel or the VS set leave free.
 */
export function lensShift(width: number, centerX: number): { fullWidth: number; offsetX: number } {
  const shift = centerX - width / 2;
  return { fullWidth: width + 2 * Math.abs(shift), offsetX: shift < 0 ? -2 * shift : 0 };
}

/** Easing for camera moves and settling props. */
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
/** Overshoots a little before settling, for a piece set down on its square. */
export const easeOutBack = (t: number) => {
  const c = 1.4;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
};

/** Progress of a step that starts `delay` seconds into a sequence and lasts `duration`, 0 to 1. */
export const progress = (elapsed: number, delay: number, duration: number) => Math.min(1, Math.max(0, (elapsed - delay) / duration));

/** A square's centre on the board: files a to h along +x, ranks 1 to 8 along -z (White at +z). */
export function squareCenter(square: string): { x: number; z: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square.slice(1));
  if (!(file >= 0 && file < 8 && rank >= 1 && rank <= 8)) throw new Error(`Not a square: ${square}`);
  return { x: file - 3.5, z: 4.5 - rank };
}
