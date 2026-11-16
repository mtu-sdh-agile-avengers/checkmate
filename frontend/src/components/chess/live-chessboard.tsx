import { useId, useState } from 'react';
import './live-chessboard.css';

type Kind = 'r' | 'n' | 'b' | 'q' | 'k' | 'p';
type Piece = { id: string; kind: Kind; white: boolean; square: string; captured: boolean };
// Scotch opening: 1.e4 e5 2.Nf3 Nc6 3.d4 exd4 4.Nxd4 Nf6 5.Nc3 Bb4.
// Coordinate moves, in ply order. See live-chessboard.md before editing.
const MOVES = ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'd2d4', 'e5d4', 'f3d4', 'g8f6', 'b1c3', 'f8b4'];
const BACK: Kind[] = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
// Orthographic camera above the h8 corner. Project the board plane only;
// piece silhouettes remain upright instead of being flattened with the board.
function project(square: string) {
  const x = 'abcdefgh'.indexOf(square.charAt(0)) * 50 + 25;
  const y = (8 - Number(square[1])) * 50 + 25;
  return { x: .85 * x + .7 * y + 28, y: .38 * x - .55 * y + 260 };
}
const INITIAL: Piece[] = [8, 7, 2, 1].flatMap(rank => BACK.map((kind, file) => ({
  id: `${file}-${rank}`, kind: rank === 7 || rank === 2 ? 'p' : kind,
  white: rank < 3, square: `${'abcdefgh'[file]}${rank}`, captured: false,
}))).sort((a, b) => project(a.square).y - project(b.square).y);
const positions = [INITIAL];
for (const move of MOVES) {
  const from = move.slice(0, 2), to = move.slice(2);
  positions.push(positions[positions.length - 1]!.map(piece => {
    if (piece.captured) return piece;
    if (piece.square === from) return { ...piece, square: to };
    if (piece.square === to) return { ...piece, captured: true };
    return piece;
  }));
}
const duration = MOVES.length * 1.8 + 4;
function pose(piece: Piece) {
  const { x, y } = project(piece.square);
  return `transform:translate(${x - 25}px,${y - 40}px);opacity:${piece.captured ? 0 : 1}`;
}
function PieceShape({ kind, white, prefix }: { kind: Kind; white: boolean; prefix: string }) {
  const material = `${prefix}-${white ? 'ivory' : 'ebony'}`;
  const body = `url(#${material})`;
  const crown = `url(#${material}-top)`;
  const edge = white ? '#111111' : '#eee8df';
  const highlight = white ? '#fffef4' : '#b7c0c3';
  return <g strokeWidth="1.15" strokeLinejoin="round" strokeLinecap="round">
    <ellipse cx="28" cy="40" rx="17" ry="6" fill={`url(#${prefix}-shadow)`} stroke="none" />
    <g fill={body} stroke={edge}>
      {/* Turned, layered plinths give every piece a physical footprint. */}
      <path d="M11 35 Q25 29 39 35 V39 C39 46 11 46 11 39 Z" />
      <ellipse cx="25" cy="35" rx="14" ry="5" fill={crown} />
      <path d="M15 33 Q20 28 21 23 H29 Q30 28 35 33 C35 38 15 38 15 33 Z" />
      <ellipse cx="25" cy="24" rx="6" ry="2.3" fill={crown} />
      {kind === 'p' && <><path d="M21 22 L22 17 H28 L29 22 Q25 25 21 22" /><circle cx="25" cy="14" r="6.8" fill={crown} /></>}
      {kind === 'r' && <><path d="M18 24 L18 15 H32 V24 Q25 27 18 24 Z" /><path d="M14 8 H20 V12 H23 V8 H27 V12 H30 V8 H36 V17 Q25 21 14 17 Z" /><path d="M15 8 H19 M24 8 H26 M31 8 H35" stroke={highlight} /></>}
      {kind === 'n' && <><path d="M17 25 Q18 20 27 16 L21 18 L15 18 L13 15 L19 8 L24 7 L27 3 L29 8 Q38 12 33 26 Q25 29 17 25 Z" /><path d="M28 9 Q33 14 30 23 M18 13 L21 11" stroke={highlight} fill="none" /><circle cx="22" cy="11" r="1" fill={edge} stroke="none" /><path d="M15 15 L18 15" fill="none" /></>}
      {kind === 'b' && <><path d="M25 5 C19 10 15 16 21 20 Q25 23 29 20 C35 16 31 10 25 5 Z" fill={crown} /><path d="M26 9 L29 15" stroke={edge} strokeWidth="1.6" /><ellipse cx="25" cy="22" rx="7" ry="2" /></>}
      {kind === 'q' && <><path d="M15 10 L19 22 Q25 25 31 22 L35 10 L29 16 L25 7 L21 16 Z" /><ellipse cx="25" cy="22" rx="6" ry="2" fill={crown} />{[15, 25, 35].map((x) => <circle key={x} cx={x} cy={x === 25 ? 6 : 9} r="2.2" fill={crown} />)}</>}
      {kind === 'k' && <><path d="M25 14 C14 8 13 18 20 22 Q25 25 30 22 C37 18 36 8 25 14 Z" fill={crown} /><path d="M23 3 H27 V6 H30 V9 H27 V14 H23 V9 H20 V6 H23 Z" /><path d="M24 4 V7 H21" stroke={highlight} fill="none" /><ellipse cx="25" cy="23" rx="6" ry="2" /></>}
      <path d="M13 38 C17 41 31 42 37 38 M17 33 Q20 35 24 35" fill="none" stroke={highlight} opacity=".6" />
    </g>
  </g>;
}

export function LiveChessboard() {
  const [paused, setPaused] = useState(false);
  const prefix = `chess${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const keyframes = INITIAL.map((piece, index) => {
    let frames = `0%{${pose(piece)}}`;
    MOVES.forEach((_, move) => {
      const start = (1 + move * 1.8) / duration * 100;
      const end = (1.8 + move * 1.8) / duration * 100;
      frames += `${start}%{${pose(positions[move]![index]!)}}${end}%{${pose(positions[move + 1]![index]!)}}`;
    });
    return `@keyframes ${prefix}-${index}{${frames}92%{${pose(positions[positions.length - 1]![index]!)}}94%,100%{${pose(piece)}}}`;
  }).join('');
  return <figure className="live-chessboard" data-paused={paused}>
    <style>{keyframes}</style>
    <div className="live-chessboard-kicker" aria-hidden="true"><span>MAKE YOUR</span><strong>MOVE.</strong></div>
    <svg viewBox="-8 -14 700 480" role="img" aria-label="Horizontally mirrored angled chessboard with upright sculpted ivory and ebony pieces playing a repeating Scotch opening." >
      <defs>
        {(['ivory', 'ebony'] as const).map(material => {
          const light = material === 'ivory';
          return <g key={material}>
            <linearGradient id={`${prefix}-${material}`} x1="0" y1="0" x2="1" y2=".2">
              <stop offset="0" stopColor={light ? '#a79b85' : '#14191c'} />
              <stop offset=".24" stopColor={light ? '#ffffff' : '#414141'} />
              <stop offset=".43" stopColor={light ? '#fffaf2' : '#191919'} />
              <stop offset=".78" stopColor={light ? '#c7b99e' : '#1c2327'} />
              <stop offset="1" stopColor={light ? '#96876e' : '#0e1215'} />
            </linearGradient>
            <radialGradient id={`${prefix}-${material}-top`} cx=".32" cy=".23" r=".8">
              <stop offset="0" stopColor={light ? '#fffef5' : '#899397'} />
              <stop offset=".28" stopColor={light ? '#f6efdd' : '#4e595e'} />
              <stop offset=".72" stopColor={light ? '#d3c5aa' : '#252e33'} />
              <stop offset="1" stopColor={light ? '#a39479' : '#101619'} />
            </radialGradient>
          </g>;
        })}
        <radialGradient id={`${prefix}-shadow`}><stop stopColor="#101414" stopOpacity=".48" /><stop offset="1" stopColor="#101414" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${prefix}-frame`} x2=".8" y2="1"><stop stopColor="#a7a5a0" /><stop offset=".45" stopColor="#80796d" /><stop offset="1" stopColor="#55514a" /></linearGradient>
        <linearGradient id={`${prefix}-light`} x2="1" y2="1"><stop stopColor="#ffffff" stopOpacity=".14" /><stop offset="1" stopColor="#111715" stopOpacity=".08" /></linearGradient>
      </defs>
      <ellipse className="live-chessboard-ground-shadow" cx="338" cy="312" rx="320" ry="152" fill={`url(#${prefix}-shadow)`} opacity=".65" />
      <g className="live-chessboard-floating">
      <g transform="matrix(.85 .38 .7 -.55 28 272)">
        <rect x="-18" y="-18" width="436" height="436" rx="1" fill="#080808" />
      </g>
      <g transform="matrix(.85 .38 .7 -.55 28 266)">
        <rect x="-18" y="-18" width="436" height="436" rx="1" fill="#fffaf2" />
      </g>
      <g transform="matrix(.85 .38 .7 -.55 28 260)">
      <rect x="-18" y="-18" width="436" height="436" rx="1" fill={`url(#${prefix}-frame)`} stroke="#151515" />
      <rect x="-2" y="-2" width="404" height="404" fill="#4b4e48" />
      {Array.from({ length: 64 }, (_, i) => <rect key={i} x={(i % 8) * 50} y={Math.floor(i / 8) * 50} width="50" height="50" fill={(i + Math.floor(i / 8)) % 2 ? '#161616' : '#fffaf2'} />)}
      <rect width="400" height="400" fill={`url(#${prefix}-light)`} />
      </g>
      <g className="live-chessboard-pieces" style={{ animationDuration: `${duration}s` }}>
        {INITIAL.map((piece, index) => <g key={piece.id} className="live-chessboard-piece" style={{ animationName: `${prefix}-${index}`, animationDuration: `${duration}s`, transform: pose(piece).split(';')[0]!.slice(10) }} fill={piece.white ? '#fffdf5' : '#242728'} stroke={piece.white ? '#343737' : '#deded6'}>
          <PieceShape kind={piece.kind} white={piece.white} prefix={prefix} />
        </g>)}
      </g>
      </g>
    </svg>
    <figcaption><span>THE SCOTCH OPENING</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Play animation' : 'Pause animation'}</button></figcaption>
  </figure>;
}


