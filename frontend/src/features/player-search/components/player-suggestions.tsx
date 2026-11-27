import { useLayoutEffect, useRef, useState } from 'react';
import { History } from 'lucide-react';
import { optionId, type SuggestionOption, type SuggestionStatus } from '@/features/player-search/utils/suggestion-options';
import './player-suggestions.css';

const KIND_LABELS: Record<SuggestionOption['kind'], string> = { recent: 'Recent', exact: 'Exact match', titled: 'Titled player' };

const STATUS_TEXT: Record<SuggestionStatus, string> = {
  loading: 'Searching accounts…',
  empty: 'No matching accounts. Press Enter to look the name up anyway.',
  failed: 'Suggestions are not available right now. Press Enter to search.',
};

/**
 * The dropdown under the search box (the popup of SearchForm's combobox): a listbox of
 * accounts, the highlighted one (`active`) marked for assistive technology through the
 * input's aria-activedescendant, so focus stays in the input while the arrows move through
 * it. A press on an account picks it (`onPick`) without taking focus from the input; the
 * pointer over one highlights it (`onHover`). With nothing to offer, it says why (`status`).
 * It is never taller than the room left under it in the window (it scrolls inside), and the
 * highlighted account is kept in view.
 */
export function PlayerSuggestions({ id, options, active, status, onPick, onHover }: {
  id: string;
  options: readonly SuggestionOption[];
  active: number;
  status: SuggestionStatus | null;
  onPick: (option: SuggestionOption) => void;
  onHover: (index: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const room = window.innerHeight - element.getBoundingClientRect().top - 12;
    element.style.maxHeight = `${Math.max(140, Math.min(330, room))}px`;
    const highlighted = active >= 0 ? element.ownerDocument.getElementById(optionId(id, active)) : null;
    if (highlighted) {
      const top = highlighted.offsetTop;
      const bottom = top + highlighted.offsetHeight;
      if (top < element.scrollTop) element.scrollTop = top;
      else if (bottom > element.scrollTop + element.clientHeight) element.scrollTop = bottom - element.clientHeight;
    }
  });
  return (
    <div className="player-suggestions" ref={box}>
      {options.length > 0 && (
        <ul id={id} role="listbox" aria-label="Suggested players" className="player-suggestions__list">
          {options.map((option, index) => (
            <li
              key={option.username}
              id={optionId(id, index)}
              role="option"
              aria-selected={index === active}
              className="player-suggestions__option"
              data-kind={option.kind}
              // Keep focus in the input: the click picks the account.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onPick(option)}
              onMouseMove={() => {
                if (index !== active) onHover(index);
              }}
            >
              <SuggestionAvatar option={option} />
              <span className="player-suggestions__name">{option.username}</span>
              {option.title && <span className="player-suggestions__title">{option.title}</span>}
              <span className="player-suggestions__kind">
                {option.kind === 'recent' && <History size={13} aria-hidden="true" />}
                {KIND_LABELS[option.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {options.length === 0 && status && (
        <p className="player-suggestions__status" data-status={status}>{STATUS_TEXT[status]}</p>
      )}
    </div>
  );
}

/** The account's picture, or its initial when it has none (or it does not load). */
function SuggestionAvatar({ option }: { option: SuggestionOption }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="player-suggestions__avatar" aria-hidden="true">
      {option.avatar && !broken ? (
        <img src={option.avatar} alt="" width={26} height={26} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      ) : (
        option.username.charAt(0).toUpperCase()
      )}
    </span>
  );
}
