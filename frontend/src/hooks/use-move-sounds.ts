import { useEffect, useRef, useSyncExternalStore } from 'react';
import { isSoundMuted, moveSoundKind, playMoveSound, setSoundMuted, subscribeToSound, unlockOnGesture } from '@/lib/sound';

/**
 * A click for every move added to `moves` (SAN), the player's and the computer's alike; a
 * capture clicks twice. The audio starts with the visitor's first click or key press on the
 * page (autoplay rules, lib/sound.ts), and nothing plays while the sounds are muted. A shorter
 * list (a new game, a move taken back) plays nothing.
 */
export function useMoveSounds(moves: readonly string[]): void {
  const count = useRef(moves.length);
  useEffect(() => unlockOnGesture(), []);
  useEffect(() => {
    const before = count.current;
    count.current = moves.length;
    if (moves.length > before) playMoveSound(moveSoundKind(moves.at(-1)));
  }, [moves]);
}

/** Whether the move sounds are muted, and a setter; remembered between visits. */
export function useSoundMuted(): [boolean, (muted: boolean) => void] {
  const muted = useSyncExternalStore(subscribeToSound, isSoundMuted, () => false);
  return [muted, setSoundMuted];
}
