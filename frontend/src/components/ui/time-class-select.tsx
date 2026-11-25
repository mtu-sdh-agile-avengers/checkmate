import { useId } from 'react';
import { Clock3 } from 'lucide-react';
import { TIME_CLASSES } from '@/config/constants';
import type { TimeClass } from '@/types/chess';

/** The time class picker of the statistics pages. Its id is unique, so two pages can be
 *  on screen together (the channels of the player view). With `allLabel` it also offers
 *  every time class at once, as the value `'all'` (the Games channel). */
export function TimeClassSelect<T extends TimeClass | 'all' = TimeClass>({
  value,
  onChange,
  allLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  allLabel?: string;
}) {
  const id = useId();
  return (
    <div className="filter-unit">
      <label className="filter-label" htmlFor={id}>Time class</label>
      <div className="select-wrap">
        <Clock3 size={18} aria-hidden="true" />
        <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)}>
          {allLabel && <option value="all">{allLabel}</option>}
          {TIME_CLASSES.map(({ value: option, label }) => <option value={option} key={option}>{label}</option>)}
        </select>
      </div>
    </div>
  );
}
