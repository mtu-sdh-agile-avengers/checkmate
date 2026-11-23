import { useId } from 'react';
import { Clock3 } from 'lucide-react';
import { TIME_CLASSES } from '@/config/constants';
import type { TimeClass } from '@/types/chess';

/** The time class picker of the statistics pages. Its id is unique, so two pages can be
 *  on screen together (the Recent and Overall channels of the player view). */
export function TimeClassSelect({ value, onChange }: { value: TimeClass; onChange: (value: TimeClass) => void }) {
  const id = useId();
  return (
    <div className="filter-unit">
      <label className="filter-label" htmlFor={id}>Time class</label>
      <div className="select-wrap">
        <Clock3 size={18} aria-hidden="true" />
        <select id={id} value={value} onChange={(event) => onChange(event.target.value as TimeClass)}>
          {TIME_CLASSES.map(({ value: option, label }) => <option value={option} key={option}>{label}</option>)}
        </select>
      </div>
    </div>
  );
}
