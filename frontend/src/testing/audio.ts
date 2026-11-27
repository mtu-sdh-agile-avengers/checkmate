import { vi } from 'vitest';

/** A Web Audio parameter: it only records what it is set to. */
const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });

/**
 * A stand-in for the Web Audio API (jsdom has none): it builds nothing that sounds, but
 * records each sound source started (`started`, with its time) and the contexts made.
 * Install it with `vi.stubGlobal('AudioContext', FakeAudioContext)`.
 */
export class FakeAudioContext {
  static made: FakeAudioContext[] = [];
  state: AudioContextState;
  currentTime = 1;
  sampleRate = 8000;
  destination = {};
  started: { kind: 'noise' | 'tone'; at: number }[] = [];
  // As in a browser, a context wakes a moment after it is asked to.
  resume = vi.fn(() =>
    Promise.resolve().then(() => {
      this.state = 'running';
    }),
  );
  close = vi.fn(async () => {
    this.state = 'closed';
  });

  constructor() {
    this.state = FakeAudioContext.startState;
    FakeAudioContext.made.push(this);
  }

  /** The state a new context starts in: 'suspended' where the browser holds audio back. */
  static startState: AudioContextState = 'running';

  static reset() {
    FakeAudioContext.made = [];
    FakeAudioContext.startState = 'running';
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }

  createBufferSource() {
    return this.source('noise');
  }

  createOscillator() {
    return { ...this.source('tone'), type: 'sine', frequency: param() };
  }

  createBiquadFilter() {
    return { type: 'lowpass', frequency: param(), Q: param(), connect: vi.fn() };
  }

  createGain() {
    return { gain: param(), connect: vi.fn() };
  }

  private source(kind: 'noise' | 'tone') {
    return {
      buffer: null as unknown,
      connect: vi.fn(),
      start: (at: number) => this.started.push({ kind, at }),
      stop: vi.fn(),
    };
  }
}
