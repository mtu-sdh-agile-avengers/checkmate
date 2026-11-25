import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatsTv, type TvChannel } from './stats-tv';

const CHANNELS: readonly TvChannel<'recent' | 'games'>[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'games', label: 'Games' },
];

describe('stats tv', () => {
  it('replays the flicker for a new channel and a new scene, not for a re-render', () => {
    const tv = (channel: 'recent' | 'games', scene?: string) => (
      <StatsTv label="Channels" channels={CHANNELS} channel={channel} scene={scene} onChannel={vi.fn()} side={null}>picture</StatsTv>
    );
    const { container, rerender } = render(tv('recent'));
    const flip = () => container.querySelector('.stats-tv')?.getAttribute('data-flip');

    expect(flip()).toBe('0');
    rerender(tv('games'));
    expect(flip()).toBe('1');
    rerender(tv('games', 'game-1')); // a game opens on the same channel
    expect(flip()).toBe('0');
    rerender(tv('games', 'game-1'));
    expect(flip()).toBe('0');
  });
});
