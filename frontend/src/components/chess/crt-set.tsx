import type { CSSProperties } from 'react';
import type { TvSignal } from './use-tv-signals';
import { ScreenArt } from './tv-screen-art';
import noiseTexture from '@/assets/crt-noise.png';
import './crt-set.css';

/* One vintage CRT, shared by every scene that shows televisions. The cabinet front is a
   small SVG; gradients, the noise tile and the glass clip path live once in <CrtDefs>
   and are referenced by id from every face. */
export type CrtHue = 'graphite' | 'silver';

// Screen-local glass (220 x 160): a wide "pillow" CRT face with bulging edges.
const SCREEN = 'M16 3 Q110 -3 204 3 Q217 5 218 18 Q222 80 218 142 Q217 155 204 157 Q110 163 16 157 Q3 155 2 142 Q-2 80 2 18 Q3 5 16 3 Z';
// Thin tracking lines ride on the moving noise layer, so they jump with each static frame.
const GLITCH = 'M-18 -56 L-6 216 M46 -56 L58 216 M150 -56 L134 216 M214 -56 L238 216 M76 -56 L198 216 M262 -56 L170 216';

/** Shared paint servers: render once per scene, before any <CrtFace>. */
export function CrtDefs({ id }: { id: string }) {
  return <svg className="crt-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-case-graphite`} x2=".8" y2="1"><stop stopColor="#4a4947" /><stop offset=".14" stopColor="#2c2b29" /><stop offset=".6" stopColor="#1f1e1c" /><stop offset="1" stopColor="#121110" /></linearGradient>
      <linearGradient id={`${id}-case-silver`} x2=".8" y2="1"><stop stopColor="#64625e" /><stop offset=".14" stopColor="#403e3b" /><stop offset=".6" stopColor="#2e2d2a" /><stop offset="1" stopColor="#1b1a18" /></linearGradient>
      <linearGradient id={`${id}-bezel`} x2=".7" y2="1"><stop stopColor="#0d0c0a" /><stop offset=".5" stopColor="#1f1e1c" /><stop offset="1" stopColor="#5f5e5c" /></linearGradient>
      <radialGradient id={`${id}-glass`}><stop stopColor="#ffffff" stopOpacity="0" /><stop offset=".7" stopColor="#0f0e0c" stopOpacity=".05" /><stop offset="1" stopColor="#0a0907" stopOpacity=".85" /></radialGradient>
      <linearGradient id={`${id}-reflection`} x2=".5" y2="1"><stop stopColor="#f7f6f4" stopOpacity=".28" /><stop offset=".4" stopColor="#ffffff" stopOpacity="0" /></linearGradient>
      <pattern id={`${id}-noise`} width="128" height="128" patternUnits="userSpaceOnUse"><image href={noiseTexture} width="128" height="128" /></pattern>
      <pattern id={`${id}-scan`} width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 1 H3" stroke="#0a0907" strokeOpacity=".32" /></pattern>
      <clipPath id={`${id}-screen`}><path d={SCREEN} /></clipPath>
    </defs>
  </svg>;
}

/** Cabinet front with its screen. `signal` decides between static and a picture. */
export function CrtFace({ id, hue, index, signal }: { id: string; hue: CrtHue; index: number; signal?: TvSignal }) {
  const content = signal?.content ?? index;
  return <svg className={`crt-face crt-face--${hue}`} viewBox="0 0 250 200" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <rect width="250" height="200" rx="5" fill={`url(#${id}-case-${hue})`} stroke="#0b0a08" strokeWidth="2" />
    <path d="M6 2.5 H244 M2.5 6 V194" stroke="#9a9895" strokeWidth="1.4" opacity=".35" fill="none" />
    <rect x="8" y="6" width="234" height="176" rx="20" fill={`url(#${id}-bezel)`} stroke="#0d0c0a" strokeWidth="2.5" />
    <g transform="translate(15 14)">
      <path d={SCREEN} fill="none" className="crt-screen-rim" strokeWidth="3" />
      <g clipPath={`url(#${id}-screen)`} className="crt-screen"
        data-active={signal?.active ?? false} data-revealed={(signal?.revision ?? 0) > 0} data-channel={content % 9}
        // A per-set negative delay keeps neighbouring static out of step.
        style={{ '--crt-delay': `${-index * 1.37}s` } as CSSProperties}>
        <rect x="-4" y="-4" width="228" height="168" fill="#636260" />
        {/* Overscan covers all eight noise offsets without painting a huge surface. */}
        <g className="crt-static"><g className="crt-noise">
          <rect x="-56" y="-56" width="332" height="272" fill={`url(#${id}-noise)`} />
          <path className="crt-glitch" d={GLITCH} />
        </g></g>
        <rect x="-4" y="-4" width="228" height="168" className="crt-screen-tint" />
        <g className="crt-transmission"><g transform="translate(110 88) scale(1.2) translate(-83 -72)"><ScreenArt index={content} /></g></g>
        <rect x="-4" y="-4" width="228" height="168" fill={`url(#${id}-scan)`} />
        <rect className="crt-tear" x="-4" y="-22" width="228" height="12" fill="#fffefa" />
        <path className="crt-roll" d="M-4 4 H224" stroke="#dad9d7" strokeWidth="12" />
        <rect x="-4" y="-4" width="228" height="168" fill={`url(#${id}-glass)`} />
        <path d="M10 6 Q100 0 200 6 L132 66 L4 104 Z" fill={`url(#${id}-reflection)`} />
        <path d="M14 6 Q110 0 206 6" fill="none" stroke="#faf9f7" strokeWidth="1.4" opacity=".5" />
      </g>
    </g>
    {/* Slim control strip: grille slots, indicator dots, two knobs and corner screws. */}
    <path d="M18 189 H66 M18 193.5 H66" stroke="#0e0d0b" strokeWidth="1.8" />
    {[176, 182, 188].map(cx => <circle key={cx} cx={cx} cy="191" r="1.3" fill="#bcbbb9" />)}
    <g fill="#151412" stroke="#757472" strokeWidth="1.2"><circle cx="207" cy="191" r="4.2" /><circle cx="222" cy="191" r="4.2" /></g>
    <g fill="#0c0b09" stroke="#6e6d6b" strokeWidth=".8">{[[5, 5], [245, 5], [5, 195], [245, 195]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" />)}</g>
  </svg>;
}
