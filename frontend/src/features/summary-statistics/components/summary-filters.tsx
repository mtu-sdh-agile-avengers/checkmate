import { TimeClassSelect } from '@/components/ui/time-class-select';
import { TIME_FRAMES } from '@/config/constants';
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
      <TimeClassSelect value={timeClass} onChange={onClassChange} />
    </div>
  );
}
