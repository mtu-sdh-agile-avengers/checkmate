/** Whether this browser can draw the 3D set (WebGL 2). Without it, the flat table is shown. */
export function canRender3d(): boolean {
  return typeof window !== 'undefined' && typeof window.WebGL2RenderingContext !== 'undefined';
}

let loading: Promise<typeof import('./chess-scene')> | null = null;

/**
 * The 3D set's code (three.js with it) is a chunk of its own, fetched the first time a
 * top-down view needs it, or earlier by `stage-layout` while the visitor is still on the
 * search. A failed fetch can be tried again.
 */
export function loadChessScene() {
  loading ??= import('./chess-scene').catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
