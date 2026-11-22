import { useId, useRef, type KeyboardEvent, type RefObject } from 'react';
import { Check } from 'lucide-react';
import { SidePanel } from '@/components/ui/side-panel';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_LEVELS,
  type DifficultyId,
  type DifficultyLevel,
} from '@/features/play-computer/config/difficulty-levels';
import './difficulty-panel.css';

/**
 * In-Game Chess setup: pick the computer's strength, then start or go back.
 *
 * The levels are a radio group (one Tab stop; arrow keys, Home and End move the selection,
 * skipping levels in `disabled`). The default level carries a "Default" tag whether or not it
 * is the one selected, and the selection is repeated in words under the list.
 */
export function DifficultyPanel({ value, onChange, onStart, onBack, disabled = [], leaving = false, delay, groupRef }: {
  value: DifficultyId;
  onChange: (id: DifficultyId) => void;
  onStart: () => void;
  onBack: () => void;
  disabled?: readonly DifficultyId[];
  leaving?: boolean;
  delay?: string;
  groupRef?: RefObject<HTMLDivElement | null>;
}) {
  const ids = useId();
  const options = useRef(new Map<DifficultyId, HTMLButtonElement>());
  const available = DIFFICULTY_LEVELS.filter((level) => !disabled.includes(level.id));
  const selected = DIFFICULTY_LEVELS.find((level) => level.id === value);

  function choose(id: DifficultyId) {
    if (disabled.includes(id)) return;
    onChange(id);
    options.current.get(id)?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const at = available.findIndex((level) => level.id === value);
    let next: DifficultyLevel | undefined;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = available[(at + 1) % available.length];
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = available[(at - 1 + available.length) % available.length];
        break;
      case 'Home':
        next = available[0];
        break;
      case 'End':
        next = available[available.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next) choose(next.id);
  }

  return (
    <SidePanel labelledBy={`${ids}-title`} leaving={leaving} delay={delay} className="difficulty-panel">
      <span className="side-panel__eyebrow">02 / In-Game Chess</span>
      <h1 id={`${ids}-title`} className="side-panel__title">Play the computer</h1>
      <p className="side-panel__lead">Choose how strong your opponent plays. You take White.</p>
      <div className="difficulty-list" role="radiogroup" aria-labelledby={`${ids}-legend`} ref={groupRef} onKeyDown={onKeyDown}>
        <span id={`${ids}-legend`} className="difficulty-list__legend">Difficulty</span>
        {DIFFICULTY_LEVELS.map((level) => {
          const checked = level.id === value;
          const off = disabled.includes(level.id);
          return (
            <button
              key={level.id}
              type="button"
              role="radio"
              className="difficulty-option"
              aria-checked={checked}
              aria-disabled={off || undefined}
              aria-labelledby={`${ids}-${level.id}-name`}
              aria-describedby={`${ids}-${level.id}-text`}
              tabIndex={checked ? 0 : -1}
              ref={(element) => {
                if (element) options.current.set(level.id, element);
                else options.current.delete(level.id);
              }}
              onClick={() => choose(level.id)}
            >
              <span className="difficulty-option__meter" aria-hidden="true">
                {[1, 2, 3, 4].map((step) => <i key={step} data-on={step <= level.strength} />)}
              </span>
              <span className="difficulty-option__body">
                <span className="difficulty-option__name" id={`${ids}-${level.id}-name`}>
                  {level.name}
                  {level.id === DEFAULT_DIFFICULTY && <span className="difficulty-option__tag">Default</span>}
                </span>
                <span className="difficulty-option__text" id={`${ids}-${level.id}-text`}>{level.description}</span>
              </span>
              <Check className="difficulty-option__check" size={18} strokeWidth={3} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <p className="difficulty-summary" aria-live="polite">
        Selected: <strong>{selected?.name ?? 'none'}</strong>
      </p>
      <div className="panel-actions">
        <button type="button" className="panel-button panel-button--ghost" onClick={onBack}>Back</button>
        <button type="button" className="panel-button" onClick={onStart} disabled={!selected || disabled.includes(value)}>Start game</button>
      </div>
    </SidePanel>
  );
}
