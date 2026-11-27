import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SOUND_STORAGE_KEY,
  closeAudio,
  isSoundMuted,
  moveSoundKind,
  playMoveSound,
  setSoundMuted,
  subscribeToSound,
  unlockAudio,
  unlockOnGesture,
} from '@/lib/sound';
import { FakeAudioContext } from '@/testing/audio';

const audio = () => FakeAudioContext.made.at(-1);

describe('move sounds', () => {
  beforeEach(() => {
    FakeAudioContext.reset();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => closeAudio());

  it('plays nothing before the visitor has clicked or pressed a key (autoplay rules)', () => {
    playMoveSound();

    expect(FakeAudioContext.made).toHaveLength(0);
  });

  it('starts the audio at the first gesture, then clicks for a move and twice for a capture', () => {
    const stop = unlockOnGesture();
    window.dispatchEvent(new Event('pointerdown'));

    playMoveSound('move');
    playMoveSound('capture');

    expect(FakeAudioContext.made).toHaveLength(1);
    // a click is a crack of noise over a short low tone; a capture is two clicks
    expect(audio()?.started.map(({ kind }) => kind)).toEqual(['noise', 'tone', 'noise', 'tone', 'noise', 'tone']);
    const [first, , second, , third] = audio()?.started ?? [];
    expect(third?.at).toBeGreaterThan(second?.at ?? 0);
    expect(second?.at).toBe(first?.at);

    // once running, later gestures change nothing
    window.dispatchEvent(new Event('keydown'));
    expect(FakeAudioContext.made).toHaveLength(1);
    stop();
  });

  it('wakes a context the browser held back, at the next gesture (a tap ends)', async () => {
    FakeAudioContext.startState = 'suspended';
    const stop = unlockOnGesture();

    window.dispatchEvent(new Event('pointerdown'));
    expect(audio()?.resume).toHaveBeenCalledTimes(1);
    playMoveSound(); // not running yet: silent
    expect(audio()?.started).toHaveLength(0);

    await Promise.resolve();
    window.dispatchEvent(new Event('touchend'));
    playMoveSound();
    expect(audio()?.started.length).toBeGreaterThan(0);
    stop();
  });

  it('stays silent while muted, and remembers that between visits', () => {
    setSoundMuted(true);
    unlockAudio();
    playMoveSound();

    expect(FakeAudioContext.made).toHaveLength(0); // no audio at all while muted
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
    expect(isSoundMuted()).toBe(true);

    setSoundMuted(false);
    unlockAudio();
    playMoveSound();
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe('on');
    expect(audio()?.started.length).toBeGreaterThan(0);
  });

  it('keeps the setting for this visit where storage is unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });

    setSoundMuted(true);
    expect(isSoundMuted()).toBe(true);
    setSoundMuted(false);
    expect(isSoundMuted()).toBe(false);

    getItem.mockRestore();
    setItem.mockRestore();
  });

  it('tells subscribers of a change here and in another tab', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToSound(listener);

    setSoundMuted(true);
    window.dispatchEvent(new StorageEvent('storage', { key: SOUND_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'something-else' }));
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    setSoundMuted(false);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('goes on silently where audio is missing or refused', () => {
    vi.stubGlobal('AudioContext', undefined);
    unlockAudio();
    playMoveSound();

    vi.stubGlobal('AudioContext', class {
      constructor() {
        throw new Error('refused');
      }
    });
    expect(() => unlockAudio()).not.toThrow();

    vi.stubGlobal('AudioContext', FakeAudioContext);
    unlockAudio();
    const context = audio();
    if (context) context.createGain = () => {
      throw new Error('broken');
    };
    expect(() => playMoveSound()).not.toThrow();
  });

  it('closes the audio, to start again at the next gesture', () => {
    unlockAudio();
    const first = audio();
    closeAudio();
    expect(first?.close).toHaveBeenCalled();

    playMoveSound();
    expect(first?.started).toHaveLength(0);
    unlockAudio();
    expect(FakeAudioContext.made).toHaveLength(2);
  });

  it('tells a capture from its notation', () => {
    expect(moveSoundKind('exd5')).toBe('capture');
    expect(moveSoundKind('Nxe5+')).toBe('capture');
    expect(moveSoundKind('Nf3')).toBe('move');
    expect(moveSoundKind(undefined)).toBe('move');
  });
});
