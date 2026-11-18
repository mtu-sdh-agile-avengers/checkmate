import {
  ASH, EDGE, GUEST_FACE, GUEST_MIRROR_X, HAT_BAND, INK, IVORY, OPPONENT_CHAIR, OPPONENT_SEAT, PLAYER_CHAIR, SEATED, STONE,
} from '@/components/chess/stage-shapes';

/* Flat artwork painted onto canvases for the 3D set: the board's top, the floor, and the two
   seated players as cut-paper standees (the same outlines as the side-view figures). */

/** Light and dark squares: the same warm greys as the 2D board. */
export const LIGHT_SQUARE = '#e6e2d9';
export const DARK_SQUARE = '#6b665d';
const FRAME = '#1b1c1d';

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement('canvas');
  element.width = Math.round(width);
  element.height = Math.round(height);
  const context = element.getContext('2d');
  if (!context) throw new Error('2D canvas is not available.');
  return [element, context];
}

const boards = new Map<number, HTMLCanvasElement>();

/**
 * The board's top: the 8 x 8 squares inside an ink frame `size` units across (squares are 1
 * unit), with a fine ivory line round the squares and the coordinates on all four sides,
 * the far ones turned to face Black. Painted once per visit.
 */
export function paintBoard(size: number, pixels = 1024): HTMLCanvasElement {
  const key = size * 10000 + pixels;
  const painted = boards.get(key) ?? drawBoard(size, pixels);
  boards.set(key, painted);
  return painted;
}

function drawBoard(size: number, pixels: number): HTMLCanvasElement {
  const [element, ctx] = canvas(pixels, pixels);
  const unit = pixels / size;
  const border = ((size - 8) / 2) * unit;
  ctx.fillStyle = FRAME;
  ctx.fillRect(0, 0, pixels, pixels);
  ctx.strokeStyle = IVORY;
  ctx.lineWidth = unit * 0.035;
  const inset = unit * 0.07;
  ctx.strokeRect(border - inset, border - inset, unit * 8 + inset * 2, unit * 8 + inset * 2);
  for (let row = 0; row < 8; row++) {
    for (let file = 0; file < 8; file++) {
      // Row 0 is rank 8 (the far side, at the top of the canvas); a8 is a light square.
      ctx.fillStyle = (file + row) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
      ctx.fillRect(border + file * unit, border + row * unit, Math.ceil(unit), Math.ceil(unit));
    }
  }
  ctx.fillStyle = '#d9d5cc';
  ctx.font = `800 ${Math.round(unit * 0.24)}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const edge = border / 2;
  for (let index = 0; index < 8; index++) {
    const along = border + (index + 0.5) * unit;
    const fileLetter = String.fromCharCode(97 + index);
    const rankNumber = String(8 - index);
    ctx.fillText(fileLetter, along, pixels - edge);
    ctx.fillText(rankNumber, edge, along);
    // The far side and the h-file side, turned round.
    for (const [x, y, text] of [[along, edge, fileLetter], [pixels - edge, along, rankNumber]] as const) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  return element;
}

/** Two squares of the studio floor's chequer, to repeat. */
export function paintFloorTile(pixels = 256): HTMLCanvasElement {
  const [element, ctx] = canvas(pixels, pixels);
  const half = pixels / 2;
  ctx.fillStyle = '#131315';
  ctx.fillRect(0, 0, pixels, pixels);
  ctx.fillStyle = '#5d5a54';
  ctx.fillRect(0, 0, half, half);
  ctx.fillRect(half, half, half, half);
  return element;
}

/** The cut-out edge and fill of a set of outlines, as the Cutout component draws them. */
function cutout(ctx: CanvasRenderingContext2D, shapes: readonly string[], fill: string, edge: string, width: number) {
  const paths = shapes.map((d) => new Path2D(d));
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.fillStyle = edge;
  ctx.strokeStyle = edge;
  for (const path of paths) {
    ctx.fill(path);
    ctx.stroke(path);
  }
  ctx.fillStyle = fill;
  for (const path of paths) ctx.fill(path);
}

/**
 * A standee: artwork in the side-view figures' own coordinates (floor at y = 340, table top at
 * y = 156). `box` is the part of that space the canvas holds; `seat` is where the figure
 * pivots to lean in, and `tableEdge` the x the table's edge is drawn at.
 */
export type Standee = {
  canvas: HTMLCanvasElement;
  box: { x: number; y: number; width: number; height: number };
  seat: { x: number; y: number };
  tableEdge: number;
};

const SCALE = 3;

function standeeCanvas(box: Standee['box']): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const [element, ctx] = canvas(box.width * SCALE, box.height * SCALE);
  ctx.scale(SCALE, SCALE);
  ctx.translate(-box.x, -box.y);
  return [element, ctx];
}

/** Player 1: the visitor's figure, in ink with the hat, chin on fist, facing +x. */
export function paintPlayer(): Standee {
  const box = { x: 12, y: 0, width: 186, height: 344 };
  const [element, ctx] = standeeCanvas(box);
  cutout(ctx, PLAYER_CHAIR, '#2c2c2e', IVORY, 3.5);
  // No resting arm: in 3D it would lie across the board.
  const figure = Object.entries(SEATED).filter(([part]) => part !== 'restingArm').map(([, outline]) => outline);
  cutout(ctx, figure, INK, IVORY, 5);
  ctx.fillStyle = ASH;
  ctx.fill(new Path2D(HAT_BAND));
  return { canvas: element, box, seat: { x: 90, y: 228 }, tableEdge: 152 };
}

/**
 * Player 2: the guest in ivory, in the opponent's chair, facing -x. The head is their picture
 * when `avatar` has loaded, otherwise `face` (their initial, or "?" before they are chosen).
 */
export function paintGuest(face: string, avatar: HTMLImageElement | null): Standee {
  const box = { x: -40, y: 0, width: 182, height: 344 };
  const [element, ctx] = standeeCanvas(box);
  cutout(ctx, OPPONENT_CHAIR, IVORY, EDGE, 5);
  ctx.fillStyle = STONE;
  ctx.strokeStyle = EDGE;
  ctx.lineWidth = 2.5;
  const seat = new Path2D(OPPONENT_SEAT);
  ctx.fill(seat);
  ctx.stroke(seat);
  ctx.save();
  ctx.translate(GUEST_MIRROR_X, 0);
  ctx.scale(-1, 1);
  cutout(ctx, [SEATED.coat, SEATED.thigh, SEATED.shin, SEATED.shoe, SEATED.neck, SEATED.head], IVORY, EDGE, 5);
  ctx.restore();
  const { cx, cy, r } = GUEST_FACE;
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = IVORY;
    ctx.fill();
    ctx.clip();
    // Cover the circle, cropping the picture's longer side.
    const side = Math.min(avatar.naturalWidth, avatar.naturalHeight) || 1;
    ctx.drawImage(avatar, (avatar.naturalWidth - side) / 2, (avatar.naturalHeight - side) / 2, side, side, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = EDGE;
    ctx.stroke();
  } else {
    ctx.fillStyle = INK;
    ctx.font = '900 30px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(face, cx, 63);
  }
  return { canvas: element, box, seat: { x: GUEST_MIRROR_X - 90, y: 228 }, tableEdge: 24 };
}
