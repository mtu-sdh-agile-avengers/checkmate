import { useEffect, useRef, useState } from 'react';
import { DELIBERATION_SCENE } from '@/features/deliberation/config/scene';
import type { ComparisonState } from '@/features/deliberation/types';
import { afterMotion } from '@/utils/motion';

/**
 * What the status panel shows while the players are compared. Two steps are real: the
 * players were found before (on the VS set), and FETCH lasts as long as the comparison
 * request. Reading the answer is instant, so the two steps after it are paced (STEP_MS each),
 * as is FETCH at the least: the game at the table gets a few moves in and the verdict never
 * cuts in, however fast the answer.
 */
export const DELIBERATION_STEPS = [
  'Players found',
  'Fetching their all-time records',
  'Comparing their statistics',
  'Weighing their ratings',
  'Verdict',
] as const;
const FETCH = 1;
const LAST = DELIBERATION_STEPS.length - 1;
const STEP_MS = DELIBERATION_SCENE.timing.stepMs;
/** The beat, the camera's drop to table level, the spotlight and the king's fall, before the
 *  verdict set drops. */
const REVEAL_MS = DELIBERATION_SCENE.timing.revealMs;

/**
 * - choosing: the VS set takes the two players;
 * - deliberating: the comparison runs; the players play at the table, the steps go by;
 * - revealing: a beat, then the camera drops to table level: the table in a spotlight, the
 *   winner rising in it, the loser's king falling;
 * - verdict: the verdict set drops with the breakdown;
 * - failed: the comparison failed; the verdict set drops with the error.
 */
export type Scene = 'choosing' | 'deliberating' | 'revealing' | 'verdict' | 'failed';

/**
 * Sequences Deliberation from the moment two players are confirmed (`confirmed`) to the
 * verdict, following the comparison (`status`). With reduced motion every wait is zero:
 * the steps still pass in order, but nothing is held up for an animation.
 */
export function useVerdictSequence(confirmed: boolean, status: ComparisonState['status']) {
  const [scene, setScene] = useState<Scene>(confirmed ? 'deliberating' : 'choosing');
  const [step, setStep] = useState(1); // "Players found" is done before the comparison starts
  const answered = status === 'success' || status === 'error';

  // Following the inputs, during render: back to choosing, confirmed, or tried again.
  if (!confirmed) {
    if (scene !== 'choosing') setScene('choosing');
  } else if (scene === 'choosing' || (scene === 'failed' && status === 'pending')) {
    setScene('deliberating');
    setStep(1);
  }

  // When the current step began, so a step that waited for the answer is not held longer.
  const stepStarted = useRef(0);
  useEffect(() => {
    stepStarted.current = Date.now();
  }, [scene, step]);

  useEffect(() => {
    if (scene !== 'deliberating') return;
    if (step >= LAST) {
      if (status === 'success') setScene('revealing');
      return;
    }
    if (step === FETCH && !answered) return; // the request is still out
    const wait = afterMotion(Math.max(0, STEP_MS - (Date.now() - stepStarted.current)));
    const timer = setTimeout(() => {
      // A failed request ends the deliberation; nothing is left to compare.
      if (step === FETCH && status === 'error') setScene('failed');
      else setStep((current) => current + 1);
    }, wait);
    return () => clearTimeout(timer);
  }, [scene, step, status, answered]);

  useEffect(() => {
    if (scene !== 'revealing') return;
    const timer = setTimeout(() => setScene('verdict'), afterMotion(REVEAL_MS));
    return () => clearTimeout(timer);
  }, [scene]);

  return { scene, step, progress: step / LAST };
}
