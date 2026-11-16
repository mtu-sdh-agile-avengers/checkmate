import { useId, useRef, useState, type CSSProperties } from 'react';
import { CrtDefs, CrtFace, type CrtHue } from './crt-set';
import { PieceArt, type PieceKind, type PieceTone } from './stage-art';
import { useStageParallax } from './use-stage-parallax';
import { useTvSignals } from './use-tv-signals';
import './chess-stage.css';

/* The chess stage: a dark studio floor in real CSS 3D. A chessboard floor recedes to the
   horizon; televisions are true boxes stacked in piles; chess pieces are cut-paper
   standees. Everything is placed in stage units (--u, set in chess-stage.css):
     side   distance from the centre line, as a share of the hero width (keeps piles at the flanks)
     x      extra sideways offset in units        y  height above the floor in units
     depth  distance into the stage in units (negative = in front of the footlights)
     turn / tilt  rotation about the vertical axis / lean, in degrees
   `front` props stand between the camera and the table, so they render above the page copy;
   `extra` props are dropped on small screens. */
type Spot = { side: number; x?: number; y?: number; depth: number; turn?: number; tilt?: number; front?: boolean; extra?: boolean };
type TvSpot = Spot & { hue: CrtHue };
type PieceSpot = Spot & { kind: PieceKind; tone: PieceTone; height: number; shadow?: boolean };

const LEFT = -64, RIGHT = 67;
const TVS: TvSpot[] = [
  // Left pile: three, two, one.
  { side: LEFT, x: -27, depth: 78, turn: 6, hue: 'graphite', extra: true },
  { side: LEFT, x: 1, depth: 74, turn: -4, hue: 'silver', extra: true },
  { side: LEFT, x: 29, depth: 70, turn: -16, hue: 'graphite', extra: true },
  { side: LEFT, x: -13, y: 21, depth: 77, turn: -7, hue: 'silver', extra: true },
  { side: LEFT, x: 15, y: 21, depth: 73, turn: 11, hue: 'graphite', extra: true },
  { side: LEFT, x: 2, y: 42, depth: 76, turn: 3, tilt: -5, hue: 'silver', extra: true },
  // Right pile, further back, with one set knocked off it.
  { side: RIGHT, x: -14, depth: 96, turn: 14, hue: 'silver', extra: true },
  { side: RIGHT, x: 14, depth: 92, turn: -9, hue: 'graphite', extra: true },
  { side: RIGHT, x: 0, y: 21, depth: 95, turn: 20, tilt: 3, hue: 'graphite', extra: true },
  { side: RIGHT, x: 45, y: 2.7, depth: 82, turn: -34, tilt: 12, hue: 'silver', extra: true },
  // Strays near the back wall.
  { side: -70, depth: 205, turn: 24, hue: 'silver', extra: true },
  { side: 58, depth: 210, turn: -18, hue: 'graphite', extra: true },
  // Footlights: two sets lean in from the bottom corners.
  { side: -41, y: 1.6, depth: -8, turn: 26, tilt: -7, hue: 'graphite', front: true },
  { side: 43, y: 2, depth: -14, turn: -32, tilt: 9, hue: 'silver', front: true },
];
const PIECES: PieceSpot[] = [
  { kind: 'rook', tone: 'ebony', height: 30, side: -62, depth: 38, turn: 12, extra: true },
  { kind: 'knight', tone: 'ivory', height: 28, side: -47, depth: 190, turn: -8, extra: true },
  { kind: 'queen', tone: 'ebony', height: 34, side: 63, depth: 50, turn: -10, extra: true },
  { kind: 'bishop', tone: 'ebony', height: 30, side: 45, depth: 190, turn: 6, extra: true },
  { kind: 'pawn', tone: 'ebony', height: 12, side: -20, depth: 5, tilt: 82, front: true },
  { kind: 'king', tone: 'ivory', height: 14, side: 9, depth: 3, tilt: -78, shadow: true, front: true },
];

const u = (value: number) => `calc(${value} * var(--u))`;
const place = (spot: Spot) => ({
  '--x': `calc(${spot.side}cqw + ${spot.x ?? 0} * var(--u))`, '--y': u(spot.y ?? 0), '--z': u(-spot.depth),
  '--turn': `${spot.turn ?? 0}deg`, '--tilt': `${spot.tilt ?? 0}deg`,
}) as CSSProperties;

export function ChessStage() {
  const id = `stage${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [paused, setPaused] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const signals = useTvSignals(paused, TVS.length);
  useStageParallax(stage, paused);

  const tv = (spot: TvSpot, index: number) => <div key={`tv-${index}`} className="stage-tv" data-extra={spot.extra} style={place(spot)}>
    <i className="stage-tv__side stage-tv__side--left" /><i className="stage-tv__side stage-tv__side--right" />
    <i className="stage-tv__side stage-tv__side--top" />
    <CrtFace id={id} hue={spot.hue} index={index} signal={signals[index]} />
  </div>;
  // A toppled standee pivots on the middle of its base, so lift it until its edge rests on the floor.
  const lift = (spot: PieceSpot) => spot.height * 0.33 * Math.abs(Math.sin(((spot.tilt ?? 0) * Math.PI) / 180));
  const piece = (spot: PieceSpot, index: number) => <div key={`piece-${index}`} className="stage-piece" data-extra={spot.extra}
    style={{ ...place({ ...spot, y: (spot.y ?? 0) + lift(spot) }), '--h': u(spot.height) } as CSSProperties}>
    <PieceArt kind={spot.kind} tone={spot.tone} shadow={spot.shadow} />
  </div>;
  const shadow = (spot: Spot, radius: number, key: string) => <i key={key} className="stage-shadow" data-extra={spot.extra}
    style={{ ...place(spot), '--r': u(radius) } as CSSProperties} />;
  const props = (front: boolean) => <>
    {TVS.map((spot, index) => Boolean(spot.front) === front ? tv(spot, index) : null)}
    {PIECES.map((spot, index) => Boolean(spot.front) === front ? piece(spot, index) : null)}
  </>;

  return <figure className="chess-stage" data-paused={paused} ref={stage}>
    <div className="chess-stage__art" role="img" aria-label="A dark television studio with a chessboard floor. Piles of vintage televisions flicker between static and brief broadcasts of chess pieces, and giant chess pieces stand and lie scattered across the stage. Under a spotlight a figure in a hat sits at the table, facing an empty chair.">
      <CrtDefs id={id} />
      <div className="stage-backwall">
        <StudioRig />
        <span className="stage-sign">On air</span>
      </div>
      {/* The floor has a 3D view to itself: props always stand in front of it, so it never
          needs depth-sorting against them, and its light is a flat overlay that costs nothing
          to keep in the middle of the shot while the camera tracks. */}
      <div className="stage-view stage-view--floor"><div className="stage-camera"><div className="stage-world">
        <div className="stage-floor">
          <svg className="stage-cables" viewBox="0 0 520 330" preserveAspectRatio="none" focusable="false">
            <path d="M0 196 C90 214 150 262 128 330" /><path d="M520 150 C420 176 372 236 404 330" /><path d="M150 0 C170 90 96 150 60 330" />
          </svg>
          {/* The table, its two chairs and every prop get a contact shadow on the floor itself. */}
          <i className="stage-shadow stage-shadow--table" />
          {TVS.map((spot, index) => spot.y ? null : shadow(spot, 20, `tv-${index}`))}
          {PIECES.map((spot, index) => shadow(spot, spot.height * 0.42, `piece-${index}`))}
        </div>
      </div></div><i className="stage-floor-light" /></div>
      <div className="stage-view stage-view--back"><div className="stage-camera"><div className="stage-world">
        {/* Glow thrown onto the floor in front of the two television piles. */}
        <i className="stage-glow" data-extra style={place({ side: LEFT, depth: 60 })} /><i className="stage-glow" data-extra style={place({ side: RIGHT, depth: 80 })} />
        {props(false)}
      </div></div></div>
      <div className="stage-haze">
        <StudioBeams id={id} />
        <i className="stage-smoke stage-smoke--a" /><i className="stage-smoke stage-smoke--b" />
      </div>
      <div className="stage-view stage-view--front"><div className="stage-camera"><div className="stage-world">{props(true)}</div></div></div>
      <div className="stage-vignette" />
    </div>
    <figcaption>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> <span className="chess-stage__pause-label">{paused ? 'Play animation' : 'Pause animation'}</span></button>
    </figcaption>
  </figure>;
}

/* Lighting rig and beams share one 1600 x 900 frame, so each beam leaves its own lamp. */
const LAMPS = [{ x: 800, aim: 0, key: true }, { x: 470, aim: -16 }, { x: 1130, aim: 16 }];
const lattice = (from: number, to: number, top: number, bottom: number, step: number) => {
  let d = `M${from} ${top} H${to} M${from} ${bottom} H${to} M${from} ${bottom}`;
  for (let x = from; x < to; x += step) d += ` L${x + step / 2} ${top} L${x + step} ${bottom}`;
  return d;
};
const tower = (x: number, width: number, height: number, step: number) => {
  let d = `M${x} 0 V${height} M${x + width} 0 V${height} M${x} 0`;
  for (let y = 0; y < height; y += step) d += ` L${x + width} ${y + step / 2} L${x} ${y + step}`;
  return d;
};

function StudioRig() {
  return <svg className="stage-rig" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" focusable="false">
    <g fill="none" strokeLinejoin="round">
      <path d={`${lattice(-40, 1640, 168, 192, 30)} ${tower(96, 26, 520, 34)} ${tower(1478, 26, 520, 34)}`} stroke="#1c1c1e" strokeWidth="2.5" />
      <path d="M-20 150 Q240 236 520 142 M700 150 Q980 250 1260 138 M1180 100 Q1420 210 1620 120" stroke="#19191b" strokeWidth="3" />
      <path d={`${lattice(-40, 1640, 58, 96, 42)} ${tower(300, 34, 96, 40)} ${tower(1266, 34, 96, 40)}`} stroke="#2d2d30" strokeWidth="3.5" />
    </g>
    {LAMPS.map(lamp => <g key={lamp.x} transform={`translate(${lamp.x} 96) rotate(${lamp.aim})`}>
      <path d="M-15 0 V20 M15 0 V20" stroke="#3a3a3d" strokeWidth="3" />
      <rect x="-21" y="14" width="42" height="32" rx="5" fill="#161617" stroke="#3f3f42" strokeWidth="2" />
      <path d="M-21 44 L-30 60 M21 44 L30 60" stroke="#3f3f42" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="0" cy="48" rx="17" ry="5.5" fill="#fffefa" opacity={lamp.key ? 1 : 0.7} />
      <ellipse cx="0" cy="50" rx="30" ry="12" fill="#fffefa" opacity=".14" />
    </g>)}
  </svg>;
}

function StudioBeams({ id }: { id: string }) {
  return <svg className="stage-beams" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMin slice" focusable="false">
    <defs>
      <linearGradient id={`${id}-beam`} x2="0" y2="1"><stop stopColor="#fffefa" stopOpacity=".3" /><stop offset=".55" stopColor="#fffefa" stopOpacity=".1" /><stop offset="1" stopColor="#fffefa" stopOpacity="0" /></linearGradient>
    </defs>
    <path d="M784 146 L816 146 L1090 860 L510 860 Z" fill={`url(#${id}-beam)`} />
    <path d="M462 140 L490 148 L560 760 L250 760 Z" fill={`url(#${id}-beam)`} opacity=".42" />
    <path d="M1110 148 L1138 140 L1350 760 L1040 760 Z" fill={`url(#${id}-beam)`} opacity=".42" />
  </svg>;
}
