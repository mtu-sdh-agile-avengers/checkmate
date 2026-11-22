import type { CSSProperties, ReactNode } from 'react';
import './side-panel.css';

/**
 * A paper card pinned to the right of the stage in the top-down views, styled like the
 * table's front: ink edge, stone offset shadow. It slides in once the camera has settled
 * (`delay`, default 1.05s) and out with `leaving`.
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
      style={delay ? ({ '--panel-delay': delay } as CSSProperties) : undefined}
    >
      {children}
    </aside>
  );
}
