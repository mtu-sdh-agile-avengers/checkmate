import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { CircleAlert } from 'lucide-react';
import type { FindPlayer, FoundPlayer } from '@/features/deliberation/types';
import { checkPlayer, type SlotIndex } from '@/features/deliberation/utils/validate-player';
import { parseChessUsername } from '@/utils/username';
import { afterMotion } from '@/utils/motion';
import './vs-tv.css';

export type PlayerPair = readonly [FoundPlayer, FoundPlayer];
type Slot = { input: string; player: FoundPlayer | null; checking: boolean; error: string | null };
type Phase = 'choosing' | 'locking' | 'rising';

const EMPTY: Slot = { input: '', player: null, checking: false, error: null };
const other = (index: SlotIndex): SlotIndex => (index === 0 ? 1 : 0);
/** "Locked in" holds this long before the set is raised; raising it takes RISE_MS. */
const LOCK_MS = 700;
const RISE_MS = 450;
/** A set dropped again (to change players) has landed this long after it appears. */
const DROP_MS = 1050;

/** The username in a slot as far as this device can tell: its player once found, else its valid input. */
function nameIn(slot: Slot): string | null {
  if (slot.player) return slot.player.username;
  try {
    return parseChessUsername(slot.input);
  } catch {
    return null;
  }
}

/**
 * The VS screen of Deliberation: a television lowered on two cables onto the stage floor
 * beside the table, with a slot for each player. A slot takes a Chess.com username or member link, checks it on this
 * device (not empty, a valid username, not the player in the other slot), then looks the
 * player up with the player search (`findPlayer`) and shows their picture and title.
 * "Lock in" (or Enter) does that for one slot; Confirm does it for any slot still typed in
 * and, once both players are found, shows "Locked in", raises the set and hands the pair to
 * `onConfirm`. Cancel (or Escape) goes back.
 */
export function VsTv({ findPlayer, initial = null, dropAt, introDone, leaving = false, onCancel, onConfirm, onSeatsChange }: {
  findPlayer: FindPlayer;
  /** Players to start with, already found (coming back to change them). */
  initial?: PlayerPair | null;
  /** When the drop starts (a CSS time). By default it waits for the camera to arrive. */
  dropAt?: string;
  /** The entrance has played: focus can go to the first slot. */
  introDone: boolean;
  leaving?: boolean;
  onCancel: () => void;
  onConfirm: (players: PlayerPair) => void;
  /** Told whenever a player is found or a slot reopened, so the table can seat the players. */
  onSeatsChange?: (seats: readonly [FoundPlayer | null, FoundPlayer | null]) => void;
}) {
  const ids = useId();
  const [slots, setSlots] = useState<readonly [Slot, Slot]>(() =>
    initial
      ? [
          { ...EMPTY, input: initial[0].username, player: initial[0] },
          { ...EMPTY, input: initial[1].username, player: initial[1] },
        ]
      : [EMPTY, EMPTY],
  );
  const [phase, setPhase] = useState<Phase>('choosing');
  // Confirm was pressed while a lookup was still out: lock in as soon as both players are found.
  const [confirming, setConfirming] = useState(false);
  const tv = useRef<HTMLDivElement>(null);
  const sections = useRef<[HTMLElement | null, HTMLElement | null]>([null, null]);
  const inputs = useRef<[HTMLInputElement | null, HTMLInputElement | null]>([null, null]);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<SlotIndex | 'confirm' | null>(null);
  const requests = useRef<[number, number]>([0, 0]);
  const focusDelay = dropAt ? DROP_MS + 120 : 0;

  // Moves focus where the last action asked for it, once the slots have re-rendered.
  useEffect(() => {
    const target = pendingFocus.current;
    if (target === null) return;
    pendingFocus.current = null;
    (target === 'confirm' ? confirmButton.current : inputs.current[target])?.focus();
  });

  // Once the set has landed, focus goes to the first open slot (unless the visitor is already in one).
  useEffect(() => {
    if (!introDone) return;
    const timer = setTimeout(() => {
      if (tv.current?.contains(document.activeElement)) return;
      (inputs.current[0] ?? inputs.current[1] ?? confirmButton.current)?.focus({ preventScroll: true });
    }, afterMotion(focusDelay));
    return () => clearTimeout(timer);
  }, [introDone, focusDelay]);

  const [first, second] = slots;
  useEffect(() => {
    onSeatsChange?.([first.player, second.player]);
  }, [first.player, second.player, onSeatsChange]);

  // Confirm pressed with lookups out: go as soon as both players are in.
  useEffect(() => {
    if (!confirming || !first.player || !second.player) return;
    setConfirming(false);
    setPhase('locking');
  }, [confirming, first.player, second.player]);

  // Confirmed: hold "Locked in", raise the set, then hand over the players.
  useEffect(() => {
    if (phase === 'choosing') return;
    const timer = setTimeout(
      () => {
        if (phase === 'locking') setPhase('rising');
        else if (first.player && second.player) onConfirm([first.player, second.player]);
      },
      afterMotion(phase === 'locking' ? LOCK_MS : RISE_MS),
    );
    return () => clearTimeout(timer);
  }, [phase, first.player, second.player, onConfirm]);

  function update(index: SlotIndex, change: Partial<Slot>) {
    setSlots((current) => {
      const next: [Slot, Slot] = [current[0], current[1]];
      next[index] = { ...next[index], ...change };
      return next;
    });
  }

  // After an answer, focus moves on only if the visitor has not gone somewhere else meanwhile.
  function focusIsOn(index: SlotIndex) {
    const active = document.activeElement;
    return !active || active === document.body || Boolean(sections.current[index]?.contains(active));
  }

  function lookUp(index: SlotIndex, username: string) {
    const request = ++requests.current[index];
    update(index, { checking: true, error: null });
    findPlayer(username).then(
      (player) => {
        if (requests.current[index] !== request) return;
        const moveOn = focusIsOn(index);
        setSlots((current) => {
          const next: [Slot, Slot] = [current[0], current[1]];
          const rival = current[other(index)].player;
          next[index] =
            rival && rival.username === player.username
              ? { ...current[index], checking: false, error: sameAsMessage(index) }
              : { input: player.username, player, checking: false, error: null };
          if (moveOn) pendingFocus.current = next[index].error ? index : rival ? 'confirm' : other(index);
          return next;
        });
      },
      (error: unknown) => {
        if (requests.current[index] !== request) return;
        update(index, { checking: false, error: error instanceof Error ? error.message : 'Could not look this player up.' });
        setConfirming(false);
        if (focusIsOn(index)) pendingFocus.current = index;
      },
    );
  }

  /** Checks a slot on this device and, if it passes, looks the player up. False when it does not pass.
   *  `rival` is the name it must differ from: by default the player found in the other slot. */
  function lockIn(index: SlotIndex, rival = slots[other(index)].player?.username ?? null): boolean {
    const slot = slots[index];
    if (slot.player || slot.checking) return true;
    const result = checkPlayer(slot.input, index, rival);
    if (!result.ok) {
      update(index, { error: result.error });
      pendingFocus.current = index;
      return false;
    }
    lookUp(index, result.username);
    return true;
  }

  // Leaving a slot shows a problem straight away; the lookup waits for Enter, "Lock in" or Confirm.
  function checkOnBlur(index: SlotIndex) {
    const slot = slots[index];
    if (slot.player || slot.checking || !slot.input.trim()) return;
    const result = checkPlayer(slot.input, index, slots[other(index)].player?.username ?? null);
    if (!result.ok) update(index, { error: result.error });
  }

  function confirm() {
    if (phase !== 'choosing') return;
    // Player 1 first; Player 2 must also differ from what is typed in Player 1, so a name typed
    // in both slots is reported on Player 2.
    const firstOk = lockIn(0);
    const secondOk = firstOk && lockIn(1, nameIn(slots[0]));
    if (firstOk && secondOk) setConfirming(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && phase === 'choosing') {
      event.preventDefault();
      onCancel();
    }
  }

  const filled = slots.map((slot) => slot.player !== null || slot.input.trim() !== '');
  const checking = slots.some((slot) => slot.checking);
  const canConfirm = phase === 'choosing' && !confirming && !checking && filled.every(Boolean);
  const badge = phase !== 'choosing' ? 'Locked in' : first.player && second.player ? 'Ready' : 'VS';

  return (
    <div
      className="vs-rig"
      data-phase={phase}
      data-leaving={leaving || undefined}
      style={dropAt ? ({ '--drop-at': dropAt } as CSSProperties) : undefined}
    >
      <div className="vs-tv" ref={tv} role="group" aria-labelledby={`${ids}-title`} onKeyDown={onKeyDown}>
        <div className="vs-tv__cabinet">
          <div className="vs-tv__screen">
            <header className="vs-tv__head vs-tune">
              <span className="vs-tv__eyebrow">03 / Deliberation</span>
              <h1 id={`${ids}-title`} className="vs-tv__title">Who&apos;s at the table?</h1>
            </header>
            {([0, 1] as const).map((index) => (
              <PlayerSlot
                key={index}
                index={index}
                slot={slots[index]}
                disabled={phase !== 'choosing'}
                sectionRef={(element) => {
                  sections.current[index] = element;
                }}
                inputRef={(element) => {
                  inputs.current[index] = element;
                }}
                onInput={(value) => update(index, { input: value, error: null })}
                onBlur={() => checkOnBlur(index)}
                onLock={() => lockIn(index)}
                onUnlock={() => {
                  update(index, { player: null, error: null });
                  pendingFocus.current = index;
                }}
              />
            ))}
            <div className="vs-tv__vs vs-tune" data-state={badge === 'VS' ? 'waiting' : 'ready'} aria-hidden="true">
              <span>{badge}</span>
            </div>
            <i className="vs-tv__glass" aria-hidden="true" />
          </div>
          <div className="vs-tv__controls">
            <span className="vs-tv__grille" aria-hidden="true" />
            <p className="vs-tv__hint" role="status">{hint(slots, phase)}</p>
            <div className="vs-tv__keys">
              <button type="button" className="tv-key" onClick={onCancel} disabled={phase !== 'choosing'}>Cancel</button>
              <button type="button" className="tv-key tv-key--primary" ref={confirmButton} onClick={confirm} disabled={!canConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
        <span className="vs-tv__feet" aria-hidden="true"><i /><i /></span>
      </div>
    </div>
  );
}

const sameAsMessage = (index: SlotIndex) => `Player ${index + 1} can't be the same as Player ${index === 0 ? 2 : 1}.`;

/** One line on the cabinet saying what is happening or still needed. */
function hint(slots: readonly [Slot, Slot], phase: Phase): string {
  if (phase !== 'choosing') return 'Locked in. Setting up the board…';
  const lookingUp = slots.findIndex((slot) => slot.checking);
  if (lookingUp >= 0) return `Looking up Player ${lookingUp + 1} on Chess.com…`;
  const problem = slots.findIndex((slot) => slot.error);
  if (problem >= 0) return `Check Player ${problem + 1} to continue.`;
  const [first, second] = slots.map((slot) => slot.player !== null || slot.input.trim() !== '');
  if (!first && !second) return 'Enter both players to continue.';
  if (!first) return 'Waiting for Player 1.';
  if (!second) return 'Waiting for Player 2.';
  return slots.every((slot) => slot.player) ? 'Both players are in. Confirm to start.' : 'Press Confirm to look both players up.';
}

function PlayerSlot({ index, slot, disabled, sectionRef, inputRef, onInput, onBlur, onLock, onUnlock }: {
  index: SlotIndex;
  slot: Slot;
  disabled: boolean;
  sectionRef: (element: HTMLElement | null) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  onInput: (value: string) => void;
  onBlur: () => void;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const ids = useId();
  const number = index + 1;
  const { player } = slot;
  const state = player ? 'locked' : slot.checking ? 'checking' : slot.error ? 'error' : slot.input.trim() ? 'typing' : 'empty';
  return (
    <section
      ref={sectionRef}
      className="vs-slot vs-tune"
      data-slot={number}
      data-tone={index === 0 ? 'ink' : 'paper'}
      data-state={state}
      aria-labelledby={`${ids}-label`}
      aria-busy={slot.checking || undefined}
    >
      <h2 className="vs-slot__label" id={`${ids}-label`}>
        Player {number} <span>· {index === 0 ? 'White' : 'Black'}</span>
      </h2>
      <SlotAvatar player={player} />
      {player ? (
        <div className="vs-slot__locked">
          <strong className="vs-slot__name">
            {player.username}
            {player.title && <span className="vs-slot__title">{player.title}</span>}
          </strong>
          <span className="vs-slot__link">{player.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
          <button type="button" className="vs-slot__change" onClick={onUnlock} disabled={disabled} aria-label={`Change Player ${number}`}>
            Change
          </button>
        </div>
      ) : (
        <form
          className="vs-slot__form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onLock();
          }}
        >
          <label className="sr-only" htmlFor={`${ids}-input`}>Player {number}: Chess.com username or profile link</label>
          <input
            id={`${ids}-input`}
            ref={inputRef}
            className="vs-slot__input"
            type="text"
            value={slot.input}
            onChange={(event) => onInput(event.target.value)}
            onBlur={onBlur}
            placeholder="Username or profile link"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={slot.checking}
            aria-invalid={Boolean(slot.error)}
            aria-describedby={`${ids}-message`}
            disabled={disabled}
          />
          <button type="submit" className="vs-slot__lock" disabled={disabled || slot.checking}>
            {slot.checking ? 'Checking…' : 'Lock in'}
          </button>
        </form>
      )}
      <p id={`${ids}-message`} className="vs-slot__message" data-error={slot.error ? true : undefined} role={slot.error ? 'alert' : undefined}>
        {slot.error ? (
          <>
            <CircleAlert size={15} strokeWidth={2.5} aria-hidden="true" />
            <span>{slot.error}</span>
          </>
        ) : player ? (
          'Found on Chess.com.'
        ) : slot.checking ? (
          'Looking this player up…'
        ) : (
          'A Chess.com username or chess.com/member link.'
        )}
      </p>
    </section>
  );
}

/** The player's picture once found (their initial if they have none or it fails to load), else "?". */
function SlotAvatar({ player }: { player: FoundPlayer | null }) {
  const [broken, setBroken] = useState<string | null>(null);
  const picture = player?.avatar && player.avatar !== broken ? player.avatar : null;
  return (
    <span className="vs-slot__avatar" aria-hidden="true">
      {picture ? (
        <img src={picture} alt="" onError={() => setBroken(picture)} />
      ) : player ? (
        player.username.charAt(0).toUpperCase()
      ) : (
        '?'
      )}
    </span>
  );
}
