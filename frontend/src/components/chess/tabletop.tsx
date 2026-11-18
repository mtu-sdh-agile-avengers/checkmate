import type { ReactNode } from 'react';
import './tabletop.css';

export type TabletopMode = 'computer' | 'deliberation';

/**
 * The chess table seen from straight above: the view In-Game Chess and Deliberation share.
 * It sits on its own patch of the chessboard floor, with the board (`children`) centred on
 * the table top. `near` and `far` are the players seated at the bottom and top edges.
 *
 * The camera tilts down to it from the stage: the view rises into frame as the stage
 * travels out of it (tabletop.css), and `leaving` plays that backwards while the stage
 * comes back.
 */
export function Tabletop({ mode, leaving = false, near, far, children }: {
  mode: TabletopMode;
  leaving?: boolean;
  near?: ReactNode;
  far?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="tabletop" data-mode={mode} data-leaving={leaving || undefined}>
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
