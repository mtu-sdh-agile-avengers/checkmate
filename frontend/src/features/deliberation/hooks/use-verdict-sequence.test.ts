import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComparisonState } from '@/features/deliberation/types';
import { DELIBERATION_STEPS, useVerdictSequence } from './use-verdict-sequence';

type Props = { confirmed: boolean; status: ComparisonState['status'] };
const LAST = DELIBERATION_STEPS.length - 1;

function setup() {
  return renderHook(({ confirmed, status }: Props) => useVerdictSequence(confirmed, status), {
    initialProps: { confirmed: false, status: 'idle' } as Props,
  });
}

/** Runs one round of timers; each step's timer is set by an effect once the step before has rendered. */
const tick = () => act(() => vi.runOnlyPendingTimers());
/** Runs rounds of timers until none are left. */
function settle() {
  for (let round = 0; round < 20 && vi.getTimerCount() > 0; round++) tick();
}

describe('verdict sequence', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('deliberates, waits for the answer on the last step, then reveals the winner and the verdict', () => {
    const { result, rerender } = setup();
    expect(result.current.scene).toBe('choosing');

    rerender({ confirmed: true, status: 'pending' });
    expect(result.current).toMatchObject({ scene: 'deliberating', step: 1 });
    settle();
    // Fetching is the real step: it lasts until the comparison answers.
    expect(result.current).toMatchObject({ scene: 'deliberating', step: 1 });

    rerender({ confirmed: true, status: 'success' });
    tick();
    expect(result.current).toMatchObject({ scene: 'deliberating', step: 2 });
    tick();
    expect(result.current).toMatchObject({ scene: 'deliberating', step: 3 });
    tick();
    expect(result.current).toMatchObject({ scene: 'revealing', step: LAST, progress: 1 });
    tick();
    expect(result.current.scene).toBe('verdict');

    rerender({ confirmed: false, status: 'idle' });
    expect(result.current.scene).toBe('choosing');
  });

  it('fails when the comparison fails, and deliberates again on a retry', () => {
    const { result, rerender } = setup();
    rerender({ confirmed: true, status: 'pending' });
    rerender({ confirmed: true, status: 'error' });
    settle();
    expect(result.current.scene).toBe('failed');

    rerender({ confirmed: true, status: 'pending' });
    expect(result.current).toMatchObject({ scene: 'deliberating', step: 1 });
  });
});
