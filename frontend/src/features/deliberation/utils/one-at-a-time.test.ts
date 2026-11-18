import { afterEach, describe, expect, it, vi } from 'vitest';
import { oneAtATime } from '@/features/deliberation/utils/one-at-a-time';

afterEach(() => {
  vi.useRealTimers();
});

describe('oneAtATime', () => {
  it('starts each call at least the gap after the one before has finished', async () => {
    vi.useFakeTimers();
    const started: number[] = [];
    const lookUp = oneAtATime(async (name: string) => {
      started.push(Date.now());
      // The first answer takes 300ms to come back.
      if (name === 'hikaru') await new Promise((resolve) => setTimeout(resolve, 300));
      return name.toUpperCase();
    }, 1000);

    const first = lookUp('hikaru');
    const second = lookUp('magnus');
    await vi.advanceTimersByTimeAsync(0);
    expect(started).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1299);
    expect(started).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(started).toHaveLength(2);
    expect(started[1]! - started[0]!).toBeGreaterThanOrEqual(1300);
    await expect(first).resolves.toBe('HIKARU');
    await expect(second).resolves.toBe('MAGNUS');
  });

  it('keeps going after a call fails', async () => {
    const lookUp = oneAtATime(async (name: string) => {
      if (name === 'ghost') throw new Error('not found');
      return name;
    }, 0);
    await expect(lookUp('ghost')).rejects.toThrow('not found');
    await expect(lookUp('hikaru')).resolves.toBe('hikaru');
  });
});
