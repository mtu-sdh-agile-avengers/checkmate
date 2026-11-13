import { useId, useState, type CSSProperties } from 'react';
import { useTvSignals } from './use-tv-signals';
import { CrtDefs, CrtFace } from './crt-set';
import './crt-pyramid.css';

/* A real CSS 3D scene: every TV is a box (front face + four sides) inside a rig that is
   rotated in perspective, so cabinets, screens and the stage all foreshorten together.
   Sizes are container-query units in crt-pyramid.css, so the wall scales with the hero. */
const COLS = 6, ROWS = 4;
// Mismatched cabinet depths (in multiples of --pop) reveal side panels between sets.
const POP = [0, 3, 1, 4, 2, 0, 2, 0, 3, 1, 4, 1, 4, 1, 0, 2, 0, 3, 1, 3, 1, 4, 2, 0];
const SETS = Array.from({ length: COLS * ROWS }, (_, index) => {
  const r = Math.floor(index / COLS), c = index % COLS;
  return { r, c, pop: POP[index % POP.length]!, hue: (r + c) % 2 ? 'silver' : 'graphite' } as const;
});

export function CrtPyramid() {
  const id = `crt${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [paused, setPaused] = useState(false);
  const signals = useTvSignals(paused, SETS.length);

  return <figure className="crt-pyramid crt-wall" data-paused={paused}>
    <div className="crt-wall__viewport" role="img" aria-label="A wall of twenty-four vintage CRT televisions in graphite and warm grey cabinets, stacked on a stage and receding into the page in perspective. Static alternates with anonymous silhouettes and chess pieces, including a sparkling king crown.">
      <CrtDefs id={id} />
      <div className="crt-wall__rig" style={{ '--cols': COLS, '--rows': ROWS } as CSSProperties}>
        <div className="crt-wall__stage"><i /></div>
        <div className="crt-wall__stage-front" />
        <div className="crt-wall__rack" />
        {SETS.map((tv, index) => <div key={index} className={`crt-box crt-unit crt-unit--${tv.hue}`}
          style={{ '--c': tv.c, '--r': tv.r, '--p': tv.pop } as CSSProperties}>
          <i className="crt-box__side crt-box__side--left" /><i className="crt-box__side crt-box__side--right" />
          <i className="crt-box__side crt-box__side--top" /><i className="crt-box__side crt-box__side--bottom" />
          <CrtFace id={id} hue={tv.hue} index={index} signal={signals[index]} />
        </div>)}
      </div>
      {/* Paper-coloured fog: the far end of the wall dissolves behind the search copy. */}
      <div className="crt-wall__fog" />
    </div>
    <figcaption>
      <button type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span> {paused ? 'Play animation' : 'Pause animation'}</button>
    </figcaption>
  </figure>;
}
