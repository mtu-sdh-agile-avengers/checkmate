import { Clock3 } from 'lucide-react';
import { TIME_CLASSES, TIME_FRAMES } from '@/config/constants';
import type { TimeClass, TimeFrame } from '@/types/chess';

export function SummaryFilters({
  frame,
  timeClass,
  onFrameChange,
  onClassChange,
}: {
  frame: TimeFrame;
  timeClass: TimeClass;
  onFrameChange: (value: TimeFrame) => void;
  onClassChange: (value: TimeClass) => void;
}) {
  return (
    <div className="summary-filters" aria-label="Statistics filters">
      <div className="filter-unit">
        <span className="filter-label">Time frame</span>
        <div className="segment-control" role="group" aria-label="Time frame">
          {TIME_FRAMES.map(({ value, label }) => (
            <button type="button" key={value} onClick={() => onFrameChange(value)} className={frame === value ? 'selected' : ''} aria-pressed={frame === value}>{label}</button>
          ))}
        </div>
      </div>
      <div className="filter-unit">
        <label className="filter-label" htmlFor="time-class">Time class</label>
        <div className="select-wrap"><Clock3 size={18} aria-hidden="true" />
          <select id="time-class" value={timeClass} onChange={(event) => onClassChange(event.target.value as TimeClass)}>
            {TIME_CLASSES.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
