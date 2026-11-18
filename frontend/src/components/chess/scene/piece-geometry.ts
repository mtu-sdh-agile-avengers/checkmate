import { BoxGeometry, BufferGeometry, ExtrudeGeometry, LatheGeometry, Path, Shape, SphereGeometry, Vector2 } from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PieceKind } from '@/components/chess/stage-art';

/* The chess pieces as 3D models: turned (lathe) Staunton-style bodies, the knight's head cut
   from a profile and bevelled, and small parts (merlons, coronet pearls, cross) merged on.
   One square of the board is 1 unit; every piece stands on y = 0 at its square's centre.
   Heights follow a tournament set: king 1.7 squares, pawn 0.9. */

const SEGMENTS = 36;
const DIVISIONS = 7;

/** A turned body from a profile drawn bottom to top, starting and ending on the axis. */
function turned(draw: (path: Path) => void): BufferGeometry {
  const path = new Path();
  draw(path);
  const points = path.getPoints(DIVISIONS).map((point) => new Vector2(Math.max(0, point.x), point.y));
  return new LatheGeometry(points, SEGMENTS);
}

/** The foot every piece shares: a flat base, a rounded bead and a smaller bead above it.
 *  Ends at (radius - 0.085, 0.165), where the stem starts. */
function foot(path: Path, radius: number) {
  path.moveTo(0, 0);
  path.lineTo(radius, 0);
  path.lineTo(radius, 0.045);
  path.quadraticCurveTo(radius + 0.014, 0.088, radius - 0.045, 0.106);
  path.lineTo(radius - 0.058, 0.116);
  path.quadraticCurveTo(radius - 0.028, 0.142, radius - 0.085, 0.165);
}

/** A collar: a rounded ring of `radius` at `y`, stepping back in to `inner`. */
function collar(path: Path, y: number, radius: number, inner: number) {
  path.lineTo(radius - 0.02, y);
  path.quadraticCurveTo(radius + 0.012, y + 0.024, radius - 0.02, y + 0.05);
  path.lineTo(inner, y + 0.062);
}

function pawn() {
  return turned((p) => {
    foot(p, 0.3);
    p.bezierCurveTo(0.15, 0.21, 0.112, 0.36, 0.106, 0.47);
    collar(p, 0.48, 0.19, 0.092);
    p.absarc(0, 0.72, 0.168, -1.02, Math.PI / 2, false);
  });
}

function rook() {
  const body = turned((p) => {
    foot(p, 0.335);
    p.bezierCurveTo(0.2, 0.23, 0.19, 0.55, 0.208, 0.69);
    collar(p, 0.7, 0.262, 0.232);
    p.quadraticCurveTo(0.262, 0.82, 0.29, 0.88);
    p.lineTo(0.29, 0.93);
    p.lineTo(0.215, 0.93);
    p.lineTo(0.215, 0.885);
    p.lineTo(0, 0.885);
  });
  // Five merlons round the top, with the gaps between them as the crenels.
  const merlons = Array.from({ length: 5 }, (_, index) => {
    const merlon = new BoxGeometry(0.15, 0.1, 0.075);
    merlon.translate(0, 0.93 + 0.05, 0.2525);
    merlon.rotateY((index / 5) * Math.PI * 2);
    return merlon;
  });
  return merge([body, ...merlons]);
}

/** The knight's head in profile, snout towards +x, from the collar (y = 0) to the ears. */
function knightHead(): ExtrudeGeometry {
  const head = new Shape();
  head.moveTo(-0.19, 0);
  head.bezierCurveTo(-0.27, 0.22, -0.235, 0.47, -0.1, 0.65);
  head.lineTo(-0.075, 0.77);
  head.lineTo(0.0, 0.69);
  head.bezierCurveTo(0.125, 0.67, 0.245, 0.56, 0.31, 0.415);
  head.quadraticCurveTo(0.345, 0.325, 0.28, 0.285);
  head.lineTo(0.17, 0.3);
  head.quadraticCurveTo(0.08, 0.275, 0.055, 0.21);
  head.bezierCurveTo(0.1, 0.12, 0.2, 0.055, 0.215, 0);
  head.lineTo(-0.19, 0);
  const depth = 0.17;
  const geometry = new ExtrudeGeometry(head, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function knight() {
  const body = turned((p) => {
    foot(p, 0.335);
    p.bezierCurveTo(0.215, 0.21, 0.205, 0.28, 0.222, 0.32);
    collar(p, 0.33, 0.27, 0.0);
  });
  const head = knightHead();
  head.translate(0, 0.37, 0);
  return merge([body, head]);
}

function bishop() {
  return turned((p) => {
    foot(p, 0.335);
    p.bezierCurveTo(0.19, 0.23, 0.13, 0.45, 0.124, 0.64);
    collar(p, 0.65, 0.215, 0.15);
    p.quadraticCurveTo(0.178, 0.725, 0.128, 0.745);
    // The mitre: swells out, then narrows to a point.
    p.bezierCurveTo(0.215, 0.82, 0.215, 1.02, 0.03, 1.2);
    p.lineTo(0.032, 1.215);
    p.absarc(0, 1.26, 0.05, -0.95, Math.PI / 2, false);
  });
}

function queen() {
  const body = turned((p) => {
    foot(p, 0.36);
    p.bezierCurveTo(0.205, 0.24, 0.142, 0.52, 0.132, 0.86);
    collar(p, 0.87, 0.225, 0.158);
    p.quadraticCurveTo(0.19, 0.95, 0.142, 0.975);
    p.bezierCurveTo(0.165, 1.1, 0.235, 1.23, 0.258, 1.3);
    p.lineTo(0.236, 1.322);
    p.quadraticCurveTo(0.16, 1.33, 0.126, 1.37);
    p.absarc(0, 1.37, 0.126, 0, Math.PI / 2 - 0.36, false);
    p.lineTo(0.03, 1.5);
    p.absarc(0, 1.545, 0.058, -1.05, Math.PI / 2, false);
  });
  // The coronet: a ring of pearls on the rim.
  const pearls = Array.from({ length: 9 }, (_, index) => {
    const pearl = new SphereGeometry(0.036, 10, 8);
    pearl.translate(0, 1.33, 0.238);
    pearl.rotateY((index / 9) * Math.PI * 2);
    return pearl;
  });
  return merge([body, ...pearls]);
}

function king() {
  const body = turned((p) => {
    foot(p, 0.37);
    p.bezierCurveTo(0.212, 0.24, 0.152, 0.54, 0.142, 0.9);
    collar(p, 0.91, 0.235, 0.165);
    p.quadraticCurveTo(0.2, 0.99, 0.152, 1.015);
    p.bezierCurveTo(0.175, 1.13, 0.235, 1.25, 0.25, 1.33);
    p.lineTo(0.228, 1.352);
    p.quadraticCurveTo(0.172, 1.362, 0.15, 1.392);
    p.bezierCurveTo(0.13, 1.43, 0.085, 1.462, 0.05, 1.472);
    p.lineTo(0, 1.476);
  });
  const upright = new BoxGeometry(0.075, 0.27, 0.075);
  upright.translate(0, 1.476 + 0.12, 0);
  const arms = new BoxGeometry(0.21, 0.072, 0.075);
  arms.translate(0, 1.476 + 0.165, 0);
  return merge([body, upright, arms]);
}

/** Merges parts into one geometry (non-indexed, as ExtrudeGeometry is). */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
  if (!merged) throw new Error('Could not merge the parts of a chess piece.');
  for (const part of parts) part.dispose();
  return merged;
}

const BUILDERS: Record<PieceKind, () => BufferGeometry> = { pawn, rook, knight, bishop, queen, king };

/**
 * The model for one kind of piece, with a second, outline geometry: the same surface welded
 * into one closed shell with smooth normals, so it can be pushed out along them into the
 * die-cut edge the artwork has elsewhere, without cracks at the hard edges.
 */
export type PieceModel = { body: BufferGeometry; outline: BufferGeometry; height: number };

const models = new Map<PieceKind, PieceModel>();

/** The model for `kind`, built once per visit and shared by every set (each renderer uploads
 *  its own copy, and disposing a set only frees that copy). */
export function pieceModel(kind: PieceKind): PieceModel {
  let model = models.get(kind);
  if (!model) {
    model = buildPieceModel(kind);
    models.set(kind, model);
  }
  return model;
}

export function buildPieceModel(kind: PieceKind): PieceModel {
  const body = BUILDERS[kind]();
  body.computeBoundingBox();
  const shell = new BufferGeometry();
  shell.setAttribute('position', body.getAttribute('position').clone());
  const outline = mergeVertices(shell, 1e-4);
  outline.computeVertexNormals();
  shell.dispose();
  return { body, outline, height: body.boundingBox?.max.y ?? 0 };
}

export const PIECE_KINDS: readonly PieceKind[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
