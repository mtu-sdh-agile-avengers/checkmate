# CRT wall (3D)

The landing/search page is a full-bleed hero. A CSS 3D TV wall fills the space
between header and footer, and the search copy sits on the left. A paper-coloured
fog dissolves the wall's far end behind the copy so text stays legible. On phones
(700px and narrower) the wall becomes a full-width band under the search.

## Scene

- `.crt-wall__viewport`: perspective container. It is a size container, so all
  lengths are `cqh` units and the wall scales with the hero.
- `.crt-wall__rig` (preserve-3d) holds 24 TVs (6 x 4). It is hinged at its right
  end and turned -34deg on the Y axis, so it recedes into the page.
- Each `.crt-box` is a real box: an SVG front face plus four CSS side planes with
  vent slats. Mismatched depths (`--p`) expose the side panels between sets.
- A black rack sits behind the sets, with a graphite stage (diamond tread and
  screen glow) in front.
- Cabinet finishes alternate graphite / warm grey like a chessboard. The palette is
  the shared ivory/charcoal one. Gradients, noise and clip paths live once in a
  hidden `<svg>` and are referenced by every face.

## Motion

Note: the search page now uses the chess stage (`chess-stage.tsx`); this wall is kept
as an alternative and shares its television face and signal timing with the stage
(`crt-set.tsx`, `crt-set.css`, `use-tv-signals.ts`).

The noise tile comes from `scripts/generate-crt-noise.mjs` (30 static updates per
second). Each TV runs its own loop: static for 4.5-10.5s, then a picture for
1.75-3.25s, so a set shows static about 75% of the time.

Channel changes are hard cuts (stepped CSS keyframes, no fades): the picture jumps
sideways, tears into bands and collapses to a scan line, in about a quarter of a second.
Held pictures freeze their noise. Pause stops all motion. Reduced motion shows one
still frame and stops the clock.

## Running

`npm run dev` from `checkmate-repo/frontend`, served on http://localhost:5173.
