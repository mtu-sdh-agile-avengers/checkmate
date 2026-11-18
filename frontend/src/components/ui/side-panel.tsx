import type { CSSProperties, ReactNode } from 'react';
import './side-panel.css';

/**
 * A paper card pinned to the right of the stage in the top-down views, styled like the
 * table's front: ink edge, stone offset shadow. It is part of the view, so it arrives and
 * leaves with the camera move. A panel that replaces another one in the same view (the game
 * panel after "Start game", say) slides in from the right edge instead, after `delay`.
 */
export function SidePanel({ labelledBy, leaving = false, delay, className = '', children }: {
  labelledBy: string;
  leaving?: boolean;
  delay?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <aside
      className={`side-panel ${className}`.trim()}
      aria-labelledby={labelledBy}
      data-leaving={leaving || undefined}
      data-enter={delay ? 'slide' : undefined}
      style={delay ? ({ '--panel-delay': delay } as CSSProperties) : undefined}
    >
      {children}
    </aside>
  );
}
