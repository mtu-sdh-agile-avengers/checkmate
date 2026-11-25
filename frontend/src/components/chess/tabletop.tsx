import type { ReactNode } from 'react';
import './tabletop.css';

export type TabletopMode = 'computer' | 'deliberation';
/** What the camera is doing beyond looking down: see tabletop.css. */
export type TabletopPhase = 'rapid' | 'resolve';

/**
 * The chess table seen from straight above: the view In-Game Chess and Deliberation share.
 * It sits on its own patch of the chessboard floor, with the board (`children`) centred on
 * the table top. `near` and `far` are the players seated at the bottom and top edges.
 *
 * Mounting it plays the camera's arrival: the table tilts up from the angle of the side view
 * until the camera looks straight down at the middle of the board. `leaving` plays it in
 * reverse while the stage comes back.
 *
 * `phase` moves the camera on: 'rapid' tips the board towards the viewer and sways it (games
 * at speed); 'resolve' holds still for a beat, then tips the camera down to table level
 * while the table fades, for the scene that follows to take over. Timings come from custom
 * properties set by the scene (--rapid-tilt, --sway, --beat-ms, --descend-ms, ...).
 */
export function Tabletop({ mode, leaving = false, near, far, phase = null, children }: {
  mode: TabletopMode;
  leaving?: boolean;
  near?: ReactNode;
  far?: ReactNode;
  phase?: TabletopPhase | null;
  children: ReactNode;
}) {
  return (
    <div className="tabletop" data-mode={mode} data-leaving={leaving || undefined} data-phase={phase ?? undefined}>
      <div className="tabletop__camera">
        <div className="tabletop__floor" aria-hidden="true" />
        <div className="tabletop__table">
          {far && <div className="tabletop__seat tabletop__seat--far">{far}</div>}
          <div className="tabletop__surface">{children}</div>
          {near && <div className="tabletop__seat tabletop__seat--near">{near}</div>}
        </div>
      </div>
    </div>
  );
}
