import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundToggle } from '@/components/ui/sound-toggle';
import { useMoveSounds, useSoundMuted } from '@/hooks/use-move-sounds';
import { closeAudio, SOUND_STORAGE_KEY, setSoundMuted, unlockAudio } from '@/lib/sound';
import { FakeAudioContext } from '@/testing/audio';

const clicks = () => (FakeAudioContext.made.at(-1)?.started ?? []).filter(({ kind }) => kind === 'noise').length;

describe('move sounds in the game', () => {
  beforeEach(() => {
    FakeAudioContext.reset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => {
    closeAudio();
    setSoundMuted(false);
  });

  it('clicks for every move added, twice for a capture, and not for a new game', () => {
    const { rerender } = renderHook(({ moves }) => useMoveSounds(moves), { initialProps: { moves: ['e4'] } });
    unlockAudio(); // the visitor's first click

    rerender({ moves: ['e4', 'e5'] });
    expect(clicks()).toBe(1);
    rerender({ moves: ['e4', 'e5', 'Nf3', 'Nc6'] }); // two at once: one click
    expect(clicks()).toBe(2);
    rerender({ moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nxe5'] });
    expect(clicks()).toBe(4);
    rerender({ moves: [] }); // a new game
    expect(clicks()).toBe(4);
  });

  it('starts the audio at the first click on the page', () => {
    renderHook(() => useMoveSounds([]));

    window.dispatchEvent(new Event('pointerdown'));

    expect(FakeAudioContext.made).toHaveLength(1);
  });

  it('reads and sets the mute switch, kept between visits', () => {
    const { result } = renderHook(() => useSoundMuted());
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(true);
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
  });

  it('switches the sounds off and on with the Sound button, waking the audio when turned on', async () => {
    const user = userEvent.setup();
    setSoundMuted(true);
    render(<SoundToggle />);
    const toggle = screen.getByRole('button', { name: 'Sound' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('title', 'Move sounds are off');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('title', 'Move sounds are on');
    expect(FakeAudioContext.made).toHaveLength(1);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
  });
});
