import { useEffect, useRef, useState } from 'react';
import { motionAllowed } from '@/utils/motion';
import { START_PLACEMENT } from './placement';
import type { ChessScene, GuestLook, SetMode } from './scene/chess-scene';
import { canRender3d, loadChessScene } from './scene/load-chess-scene';
import { Tabletop } from './tabletop';
import { TopDownBoard } from './top-down-board';
import { TopDownFigure } from './top-down-figure';
import './chess-set.css';

/**
 * The chess set of the In-Game Chess and Deliberation views: 3D pieces on the board, on a
 * table lit like a set piece (scene/chess-scene.ts). In Deliberation the two players sit at
 * either end, Player 2 wearing `guest`'s picture (or initial).
 *
 * It only draws a position (`placement`, FEN; the start position by default): there is no
 * game behind it yet. The game engine will supply the placement as the game goes on.
 *
 * Without WebGL 2 (some older devices, and the test environment), or if the 3D code cannot
 * load, it shows the flat top-down table instead, with the same board and description.
 * `skipIntro` jumps the 3D entrance to its end; `leaving` is for the flat table's exit.
 */
export function ChessSet({ mode, label, placement = START_PLACEMENT, guest, leaving = false, skipIntro = false }: {
  mode: SetMode;
  label: string;
  placement?: string;
  guest?: GuestLook;
  leaving?: boolean;
  skipIntro?: boolean;
}) {
  const [flat, setFlat] = useState(() => !canRender3d());
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useRef<HTMLDivElement>(null);
  const scene = useRef<ChessScene | null>(null);
  const face = guest?.face ?? '?';
  const avatar = guest?.avatar ?? null;
  // What the scene is created with, as of its creation (the code may arrive a moment later).
  const latest = useRef({ placement, face, avatar, skipIntro });
  useEffect(() => {
    latest.current = { placement, face, avatar, skipIntro };
  });

  useEffect(() => {
    if (flat) return;
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    loadChessScene()
      // Setting the set up takes the main thread for a moment: let the camera move into the
      // view get going first (it runs off the main thread once started), so it never stalls.
      .then(async (module) => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return module;
      })
      .then(({ createChessScene }) => {
        const element = root.current;
        const area = focus.current;
        if (cancelled || !element || !area || !canvas.current) return;
        const { placement: start, face: initial, avatar: picture, skipIntro: skipped } = latest.current;
        const created = createChessScene(canvas.current, {
          mode,
          placement: start,
          guest: mode === 'deliberation' ? { face: initial, avatar: picture } : undefined,
          animate: motionAllowed() && !skipped,
        });
        scene.current = created;
        // Layout sizes, not on-screen boxes: the view is moving while it arrives.
        const measure = () => {
          created.resize(element.clientWidth, element.clientHeight, { left: area.offsetLeft, right: area.offsetLeft + area.offsetWidth });
        };
        observer = new ResizeObserver(measure);
        observer.observe(element);
        observer.observe(area);
        measure();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.warn('The 3D chess set could not be shown, so the flat table is shown instead.', error);
        setFlat(true);
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      scene.current?.dispose();
      scene.current = null;
    };
  }, [flat, mode]);

  useEffect(() => {
    scene.current?.setPlacement(placement);
  }, [placement]);
  useEffect(() => {
    if (mode === 'deliberation') scene.current?.setGuest({ face, avatar });
  }, [mode, face, avatar]);
  useEffect(() => {
    if (skipIntro) scene.current?.finishIntro();
  }, [skipIntro]);

  if (flat) {
    const seated = mode === 'deliberation';
    return (
      <Tabletop
        mode={mode}
        leaving={leaving}
        near={seated ? <TopDownFigure tone="ink" hat /> : undefined}
        far={seated ? <TopDownFigure tone="ivory" face={face} avatar={avatar} /> : undefined}
      >
        <TopDownBoard placement={placement} label={label} />
      </Tabletop>
    );
  }
  return (
    <div className="chess-set" data-mode={mode} ref={root} role="img" aria-label={label}>
      <canvas className="chess-set__canvas" ref={canvas} aria-hidden="true" />
      <div className="chess-set__focus" ref={focus} aria-hidden="true" />
    </div>
  );
}
