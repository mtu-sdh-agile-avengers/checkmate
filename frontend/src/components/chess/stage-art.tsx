import { useId, useState } from 'react';
import {
  ASH, EDGE, GUEST, GUEST_FACE, GUEST_MIRROR_X, HAT_BAND, INK, IVORY, OPPONENT_CHAIR, OPPONENT_SEAT, PLAYER, PLAYER_CHAIR, STONE, dot,
} from './stage-shapes';

/* Cut-paper artwork for the chess stage: flat silhouettes in the ivory/charcoal palette
   with a die-cut edge, like stickers. Everything here is decorative and aria-hidden;
   the scene that uses it carries the text description. The outlines and palette live in
   stage-shapes.ts, shared with the 3D set. */
export { INK, IVORY } from './stage-shapes';

export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceTone = 'ivory' | 'ebony';
// Plinth, stem and collar shared by every piece, in a 60 x 100 box with the base on y = 97.
const BODY = 'M7 97 V91 Q7 86 13 85 L18 85 Q26 68 24.5 47 H18 V41 H42 V47 H35.5 Q34 68 42 85 L47 85 Q53 86 53 91 V97 Z';
const PIECES: Record<PieceKind, string[]> = {
  pawn: [BODY, dot(30, 27.5, 13.5)],
  rook: [BODY, 'M16 41 V16 H23.5 V23 H27 V16 H33 V23 H36.5 V16 H44 V41 Z'],
  bishop: [BODY, 'M30 9 Q13 27 21 41 H39 Q47 27 30 9 Z', dot(30, 6, 3.6)],
  queen: [BODY, 'M17 41 L10 15 L21 28 L24 10 L30 26 L36 10 L39 28 L50 15 L43 41 Z', dot(10, 13, 3), dot(24, 8, 3), dot(36, 8, 3), dot(50, 13, 3)],
  king: [BODY, 'M19 41 L14 21 Q30 12 46 21 L41 41 Z', 'M27.5 0 H32.5 V5 H38 V10 H32.5 V17 H27.5 V10 H22 V5 H27.5 Z'],
  knight: [BODY, 'M18 41 C15 27 20 17 31 11 L29 3 L37 9 C48 13 53 24 51 34 L45 38 L37 30 C34 34 37 38 42 41 Z'],
};

/** Two passes give one clean outline around the union of the shapes, with no inner seams.
 *  Shared with the top-down figures (top-down-figure.tsx). */
export function Cutout({ shapes, fill, edge, width, shadow }: { shapes: string[]; fill: string; edge: string; width: number; shadow?: boolean }) {
  return <>
    {shadow && <g transform="translate(6 6)" fill={STONE} stroke={STONE} strokeWidth={width} strokeLinejoin="round">{shapes.map((d, i) => <path key={i} d={d} />)}</g>}
    <g fill={edge} stroke={edge} strokeWidth={width} strokeLinejoin="round">{shapes.map((d, i) => <path key={i} d={d} />)}</g>
    <g fill={fill}>{shapes.map((d, i) => <path key={i} d={d} />)}</g>
  </>;
}

function PieceShape({ kind, tone, shadow }: { kind: PieceKind; tone: PieceTone; shadow?: boolean }) {
  const ivory = tone === 'ivory';
  return <>
    <Cutout shapes={PIECES[kind]} fill={ivory ? IVORY : INK} edge={ivory ? '#0b0b0c' : IVORY} width={5} shadow={shadow} />
    {kind === 'knight' && <circle cx="41" cy="20" r="2.1" fill={ivory ? INK : IVORY} />}
    {kind === 'bishop' && <path d="M30 19 L36 28" stroke={ivory ? INK : IVORY} strokeWidth="2.2" strokeLinecap="round" />}
  </>;
}

/** A chess piece standee. The base sits on the bottom edge of the box. */
export function PieceArt({ kind, tone, shadow }: { kind: PieceKind; tone: PieceTone; shadow?: boolean }) {
  return <svg className="piece-art" viewBox="-5 -5 76 105" aria-hidden="true" focusable="false">
    <PieceShape kind={kind} tone={tone} shadow={shadow} />
  </svg>;
}

const BOARD_PIECES: { kind: PieceKind; tone: PieceTone; x: number; flip?: boolean }[] = [
  { kind: 'rook', tone: 'ivory', x: 46 }, { kind: 'king', tone: 'ivory', x: 82 }, { kind: 'pawn', tone: 'ivory', x: 124 },
  { kind: 'pawn', tone: 'ebony', x: 172 }, { kind: 'knight', tone: 'ebony', x: 214, flip: true }, { kind: 'king', tone: 'ebony', x: 254 },
];

/** The game in progress on the table, seen from the side. */
export function TableBoard() {
  return <svg className="table-board" viewBox="0 0 300 76" aria-hidden="true" focusable="false">
    {BOARD_PIECES.map(piece => <g key={piece.x} transform={`translate(${piece.x} 63) scale(${piece.flip ? -0.5 : 0.5} .5) translate(-30 -97)`}>
      <PieceShape kind={piece.kind} tone={piece.tone} />
    </g>)}
    <rect x="22" y="62" width="256" height="12" fill="#0b0b0c" stroke={IVORY} strokeWidth="2" />
    {Array.from({ length: 8 }, (_, i) => <rect key={i} x={24 + i * 31.5} y="64" width="31.5" height="8" fill={i % 2 ? INK : IVORY} />)}
  </svg>;
}

/** The player: seated in profile on the left, hat low, chin on fist, studying the board.
 *  In this 230 x 340 box the floor is y = 340 and the table top is y = 156. */
export function SeatedPlayer() {
  return <svg className="seated-player" viewBox="0 0 230 340" aria-hidden="true" focusable="false">
    <Cutout shapes={PLAYER_CHAIR} fill="#2c2c2e" edge={IVORY} width={3.5} />
    <Cutout shapes={PLAYER} fill={INK} edge={IVORY} width={5} />
    <path d={HAT_BAND} fill={ASH} />
  </svg>;
}

/** The opponent's chair: lit, empty and waiting on the search view. Once a player has been
 *  found, a guest takes the seat: the same seated figure mirrored to face the table,
 *  bare-headed, in ivory. If the player has a profile picture (`avatar`) it becomes the
 *  guest's head; without one, or if the picture fails to load, the face is a question mark.
 *  Same floor and table heights as the player. */
export function OpponentChair({ occupied = false, avatar }: { occupied?: boolean; avatar?: string | null }) {
  const clip = `head${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [broken, setBroken] = useState<string | null>(null);
  const picture = avatar && avatar !== broken ? avatar : null;
  return <svg className="opponent-chair" data-occupied={occupied} viewBox="0 0 150 340" aria-hidden="true" focusable="false">
    <Cutout shapes={OPPONENT_CHAIR} fill={IVORY} edge={EDGE} width={5} shadow />
    <path d={OPPONENT_SEAT} fill={STONE} stroke={EDGE} strokeWidth="2.5" strokeLinejoin="round" />
    {occupied && <g className="opponent-guest">
      <g transform={`translate(${GUEST_MIRROR_X} 0) scale(-1 1)`}><Cutout shapes={GUEST} fill={IVORY} edge={EDGE} width={5} /></g>
      {picture ? <g className="opponent-guest__face">
        {/* The picture sits over the drawn head, a little larger, like a cut-out photo on a stick figure. */}
        <clipPath id={clip}><circle cx={GUEST_FACE.cx} cy={GUEST_FACE.cy} r={GUEST_FACE.r} /></clipPath>
        <circle cx={GUEST_FACE.cx} cy={GUEST_FACE.cy} r={GUEST_FACE.r} fill={IVORY} />
        <image href={picture} x={GUEST_FACE.cx - GUEST_FACE.r} y={GUEST_FACE.cy - GUEST_FACE.r} width={GUEST_FACE.r * 2} height={GUEST_FACE.r * 2}
          preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} onError={() => setBroken(picture)} />
        <circle cx={GUEST_FACE.cx} cy={GUEST_FACE.cy} r={GUEST_FACE.r} fill="none" stroke={EDGE} strokeWidth="3" />
      </g> : <text x="20" y="63" textAnchor="middle" fontSize="30" fontWeight="900" fill={INK}>?</text>}
    </g>}
  </svg>;
}
