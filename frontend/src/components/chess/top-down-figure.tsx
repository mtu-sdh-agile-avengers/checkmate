import { useId, useState } from 'react';
import { Cutout, INK, IVORY } from './stage-art';

/* A seated player seen from straight above, in the same cut-out style as the side-view
   figures. The 240 x 160 box holds the figure at the near edge of the table, facing it (up):
   shoulders along the bottom, forearms reaching onto the table, hands resting just inside its
   edge at y = 32. The tabletop places the box on that edge and turns the far player round.

   The figure is in layers, so its parts can move (a player reaching for a piece): each arm,
   then the shoulders over the arms' roots, then the head (td-figure__arm--left / --right,
   __torso, __head). Their transforms are set from the stylesheet of the scene using it. */
const EDGE = '#0b0b0c';
const HAT_BRIM = '#2c2c2e';
const HAT_BAND = '#a7a5a0';

const circle = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
const capsule = (x: number, y: number, width: number, height: number) => {
  const r = height / 2;
  return `M${x + r} ${y} H${x + width - r} A${r} ${r} 0 0 1 ${x + width - r} ${y + height} H${x + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
};

const LEFT_ARM = ['M28 112 L60 98 L86 30 L60 20 Z', circle(72, 24, 15)]; // forearm and hand
const RIGHT_ARM = ['M212 112 L180 98 L154 30 L180 20 Z', circle(168, 24, 15)];
const TORSO = [capsule(20, 96, 200, 58)]; // shoulders
const HEAD = circle(120, 92, 34);

/**
 * `tone` matches the side-view figures: the visitor in ink (with the hat, seen from above as
 * brim, band and crown), the guest in ivory. A bare head can carry `face`, one character such
 * as a player's initial or "?", or `avatar`, the player's picture (the face shows instead
 * if there is none or it fails to load).
 */
export function TopDownFigure({ tone, hat = false, face, avatar = null }: {
  tone: 'ink' | 'ivory';
  hat?: boolean;
  face?: string;
  avatar?: string | null;
}) {
  const clip = `face${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [broken, setBroken] = useState<string | null>(null);
  const picture = avatar && avatar !== broken ? avatar : null;
  const fill = tone === 'ink' ? INK : IVORY;
  const edge = tone === 'ink' ? IVORY : EDGE;
  return (
    <svg className="td-figure" data-tone={tone} viewBox="0 0 240 160" aria-hidden="true" focusable="false">
      <g className="td-figure__arm td-figure__arm--left"><Cutout shapes={LEFT_ARM} fill={fill} edge={edge} width={5} /></g>
      <g className="td-figure__arm td-figure__arm--right"><Cutout shapes={RIGHT_ARM} fill={fill} edge={edge} width={5} /></g>
      <g className="td-figure__torso"><Cutout shapes={TORSO} fill={fill} edge={edge} width={5} /></g>
      <g className="td-figure__head">
        {hat ? (
          <>
            <Cutout shapes={[circle(120, 90, 52)]} fill={HAT_BRIM} edge={edge} width={5} />
            <circle cx="120" cy="90" r="37" fill="none" stroke={HAT_BAND} strokeWidth="7" />
            <Cutout shapes={[circle(120, 90, 31)]} fill={fill} edge={edge} width={4} />
          </>
        ) : (
          <>
            <Cutout shapes={[HEAD]} fill={fill} edge={edge} width={5} />
            {picture ? (
              <>
                <clipPath id={clip}><circle cx="120" cy="92" r="32" /></clipPath>
                <image className="td-figure__face" href={picture} x="88" y="60" width="64" height="64" preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clip})`} onError={() => setBroken(picture)} />
              </>
            ) : face && (
              <text className="td-figure__face" x="120" y="105" textAnchor="middle" fontSize="36" fontWeight="900" fill={tone === 'ink' ? IVORY : INK}>
                {face}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
