/* Cut-paper artwork for the chess stage: flat silhouettes in the ivory/charcoal palette
   with a die-cut edge, like stickers. Everything here is decorative and aria-hidden;
   the scene that uses it carries the text description. */
const IVORY = '#efece5';
const INK = '#121213';
// Offset 'sticker' shadows and small accents use the theme's warm greys.
const STONE = '#80796d';
const ASH = '#a7a5a0';

export type PieceKind = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceTone = 'ivory' | 'ebony';

const dot = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
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

/** Two passes give one clean outline around the union of the shapes, with no inner seams. */
function Cutout({ shapes, fill, edge, width, shadow }: { shapes: string[]; fill: string; edge: string; width: number; shadow?: boolean }) {
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

const PLAYER_CHAIR = [
  'M24 118 Q30 110 38 116 L47 238 H31 Z',
  'M28 228 H122 Q126 228 126 233 V240 H28 Z',
  'M31 240 L25 338 H36 L44 240 Z',
  'M106 240 L111 338 H121 L118 240 Z',
];
// A seated figure in profile, facing right. Floor y = 340, table top y = 156.
const SEATED = {
  coat: 'M50 230 C44 176 54 118 82 88 Q102 74 120 90 L128 116 C116 152 108 192 108 230 Z',
  coatTail: 'M50 226 L43 270 L66 263 L70 228 Z',
  thigh: 'M56 206 H150 Q162 206 162 218 V230 H56 Z',
  shin: 'M138 224 H162 L158 322 H136 Z',
  shoe: 'M132 318 H168 Q186 322 186 334 V338 H132 Z',
  collar: 'M92 94 L104 62 L117 88 Z',
  neck: 'M102 82 L116 60 L134 72 L122 94 Z',
  head: dot(134, 52, 24),
  hatBrim: 'M98 42 Q134 26 180 44 L177 51 Q134 36 100 50 Z',
  hatCrown: 'M111 37 Q110 9 134 8 Q158 9 161 35 Q136 29 111 37 Z',
  upperArm: 'M94 102 L107 88 L167 140 L153 154 Z',
  forearm: 'M149 152 L167 146 L158 82 L141 86 Z', // hand to chin
  fist: dot(150, 82, 10),
  restingArm: 'M120 140 H198 Q206 140 206 147.5 Q206 155 198 155 H120 Z', // on the table
};
const PLAYER = Object.values(SEATED);
const GUEST = [SEATED.coat, SEATED.thigh, SEATED.shin, SEATED.shoe, SEATED.neck, SEATED.head, SEATED.restingArm];

/** The player: seated in profile on the left, hat low, chin on fist, studying the board.
 *  In this 230 x 340 box the floor is y = 340 and the table top is y = 156. */
export function SeatedPlayer() {
  return <svg className="seated-player" viewBox="0 0 230 340" aria-hidden="true" focusable="false">
    <Cutout shapes={PLAYER_CHAIR} fill="#2c2c2e" edge={IVORY} width={3.5} />
    <Cutout shapes={PLAYER} fill={INK} edge={IVORY} width={5} />
    <path d="M112 32.5 Q136 24.5 161 30.5 L161 35 Q136 29 111 37 Z" fill={ASH} />
  </svg>;
}

const OPPONENT_CHAIR = [
  'M116 100 Q123 90 130 100 L120 238 H106 Z',
  'M107 100 Q121 85 135 100 L130 152 Q119 158 107 152 Z',
  'M30 228 Q26 228 26 233 V240 H122 V228 Z',
  'M33 240 L30 338 H41 L46 240 Z',
  'M106 240 L113 338 H124 L120 240 Z',
  'M40 286 H112 V292 H40 Z',
];

/** The opponent's chair: lit, empty and waiting on the search view. Once a player has been
 *  found, an anonymous guest takes the seat: the same seated figure mirrored to face the
 *  table, bare-headed, in ivory, with a question mark for a face.
 *  Same floor and table heights as the player. */
export function OpponentChair({ occupied = false }: { occupied?: boolean }) {
  return <svg className="opponent-chair" data-occupied={occupied} viewBox="0 0 150 340" aria-hidden="true" focusable="false">
    <Cutout shapes={OPPONENT_CHAIR} fill={IVORY} edge="#0b0b0c" width={5} shadow />
    <path d="M32 218 H114 Q121 218 121 224 V229 H27 V224 Q27 218 32 218 Z" fill={STONE} stroke="#0b0b0c" strokeWidth="2.5" strokeLinejoin="round" />
    {occupied && <g className="opponent-guest">
      <g transform="translate(154 0) scale(-1 1)"><Cutout shapes={GUEST} fill={IVORY} edge="#0b0b0c" width={5} /></g>
      <text x="20" y="63" textAnchor="middle" fontSize="30" fontWeight="900" fill={INK}>?</text>
    </g>}
  </svg>;
}
