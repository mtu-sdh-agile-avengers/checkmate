/**
 * Move sounds: a short wooden click, made on the spot with the Web Audio API, so there is no
 * sound file to download. A capture clicks twice.
 *
 * Browsers only let a page play sound once the visitor has clicked or pressed a key on it
 * (autoplay rules). So the audio is only switched on by such a gesture (`unlockOnGesture`, or
 * `unlockAudio` from a click handler); a move before that is simply silent, never an error.
 *
 * Muting is remembered in localStorage (`SOUND_STORAGE_KEY`), so it holds on the next visit;
 * where storage is unavailable (a private window), for the rest of this visit only.
 */

export type MoveSoundKind = 'move' | 'capture';

export const SOUND_STORAGE_KEY = 'checkmate:sound';

/** Overall loudness: a click under the page, not over it. */
const VOLUME = 0.35;
/** The crack of each click: a burst of noise this long. */
const NOISE_SECONDS = 0.05;
/** The gestures that let a page start its audio (touch needs the end of the tap). */
const GESTURES = ['pointerdown', 'pointerup', 'keydown', 'touchend'] as const;

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let mutedThisVisit = false;
const listeners = new Set<() => void>();

// Mute setting ---------------------------------------------------------------------------

/** Whether the visitor has turned the move sounds off (on by default). */
export function isSoundMuted(): boolean {
  try {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (stored !== null) return stored === 'off';
  } catch {
    // storage unavailable: the setting of this visit
  }
  return mutedThisVisit;
}

export function setSoundMuted(muted: boolean): void {
  mutedThisVisit = muted;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, muted ? 'off' : 'on');
  } catch {
    // storage unavailable: kept for this visit only
  }
  for (const listener of listeners) listener();
}

/** Calls `listener` when the setting changes, here or in another tab. */
export function subscribeToSound(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

// Audio ---------------------------------------------------------------------------------

function audioContextClass(): typeof AudioContext | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
}

/**
 * Switches the audio on. Call it from a click or a key press: browsers refuse it otherwise.
 * Nothing happens while the sounds are muted (turning them on is a click, which calls this).
 */
export function unlockAudio(): void {
  if (isSoundMuted()) return;
  const Context = audioContextClass();
  if (!Context) return;
  try {
    context ??= new Context();
    if (context.state === 'suspended') context.resume().catch(() => undefined);
  } catch {
    context = null; // audio refused: the game goes on silently
  }
}

/** Switches the audio on at the visitor's first gesture on the page; returns a cleanup. */
export function unlockOnGesture(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const stop = () => {
    for (const type of GESTURES) window.removeEventListener(type, onGesture, true);
  };
  function onGesture() {
    unlockAudio();
    if (context?.state === 'running') stop();
  }
  for (const type of GESTURES) window.addEventListener(type, onGesture, true);
  return stop;
}

/** The click of a piece set down; nothing while muted or before the audio is on. */
export function playMoveSound(kind: MoveSoundKind = 'move'): void {
  if (isSoundMuted() || !context || context.state !== 'running') return;
  try {
    const at = context.currentTime + 0.005;
    if (kind === 'capture') {
      tap(context, at, 1, 1500);
      tap(context, at + 0.045, 0.75, 2300);
    } else {
      tap(context, at, 1, 1800);
    }
  } catch {
    // a sound that cannot play is no reason to stop the game
  }
}

/** A move's sound from its SAN: "exd5" or "Nxe5+" is a capture. */
export const moveSoundKind = (san: string | undefined): MoveSoundKind => (san?.includes('x') ? 'capture' : 'move');

/** Closes the audio (it starts again with the next gesture). */
export function closeAudio(): void {
  void context?.close().catch(() => undefined);
  context = null;
  noise = null;
}

/** A burst of noise fading fast, the same every time (a fixed seed): the crack of wood on wood. */
function noiseBuffer(audio: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.round(audio.sampleRate * NOISE_SECONDS));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 7;
  for (let index = 0; index < length; index += 1) {
    seed = (seed * 16807) % 2147483647;
    data[index] = ((seed / 2147483647) * 2 - 1) * (1 - index / length) ** 4;
  }
  return buffer;
}

/** One click at `at`: a crack (filtered noise) over a short low knock (a falling sine). */
function tap(audio: AudioContext, at: number, loudness: number, pitch: number): void {
  noise ??= noiseBuffer(audio);
  const crack = audio.createBufferSource();
  crack.buffer = noise;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(pitch, at);
  filter.Q.setValueAtTime(0.9, at);
  const crackGain = audio.createGain();
  crackGain.gain.setValueAtTime(VOLUME * loudness, at);
  crackGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  crack.connect(filter);
  filter.connect(crackGain);
  crackGain.connect(audio.destination);
  crack.start(at);
  crack.stop(at + NOISE_SECONDS);

  const knock = audio.createOscillator();
  knock.type = 'sine';
  knock.frequency.setValueAtTime(pitch / 8, at);
  knock.frequency.exponentialRampToValueAtTime(pitch / 16, at + 0.05);
  const knockGain = audio.createGain();
  knockGain.gain.setValueAtTime(VOLUME * loudness * 0.6, at);
  knockGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
  knock.connect(knockGain);
  knockGain.connect(audio.destination);
  knock.start(at);
  knock.stop(at + 0.08);
}
