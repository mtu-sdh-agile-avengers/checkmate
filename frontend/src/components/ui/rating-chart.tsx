import { useId } from 'react';
import type { RatingPoint } from '@/types/chess';
import { formatNumber } from '@/utils/format';

export function RatingChart({
  points,
  title = 'Rating progression',
  subtitle,
}: {
  points: RatingPoint[];
  title?: string;
  subtitle?: string;
}) {
  const gradientId = useId().replace(/:/g, '-');
  if (points.length === 0) return <p className="empty-copy">No rating history available.</p>;

  const ratings = points.map((point) => point.rating);
  const minimum = Math.floor((Math.min(...ratings) - 30) / 50) * 50;
  const maximum = Math.ceil((Math.max(...ratings) + 30) / 50) * 50;
  const xStart = 44;
  const xEnd = 720;
  const yStart = 30;
  const yEnd = 210;
  const plot = points.map((point, index) => {
    const x = xStart + (index / Math.max(1, points.length - 1)) * (xEnd - xStart);
    const y = yEnd - ((point.rating - minimum) / Math.max(1, maximum - minimum)) * (yEnd - yStart);
    return { x, y };
  });
  const line = plot.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${xStart},${yEnd} ${line} ${xEnd},${yEnd}`;
  const lastPoint = plot[plot.length - 1];
  const ticks = [minimum, (minimum + maximum) / 2, maximum];
  const firstDate = points[0]?.date ?? '';
  const lastDate = points[points.length - 1]?.date ?? '';
  const dateLabel = (date: string) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    return parsed.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: points.length > 30 ? 'numeric' : undefined, timeZone: 'UTC' });
  };

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div>
        <strong className="chart-current">{formatNumber(points[points.length - 1]?.rating ?? 0)}</strong>
      </div>
      <svg viewBox="0 0 760 254" preserveAspectRatio="none" className="rating-svg" role="img" aria-label={`${title}: from ${formatNumber(points[0]?.rating ?? 0)} to ${formatNumber(points[points.length - 1]?.rating ?? 0)}`}>
        <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#343434" stopOpacity="0.18"/><stop offset="100%" stopColor="#343434" stopOpacity="0.012"/></linearGradient></defs>
        {ticks.map((tick) => {
          const y = yEnd - ((tick - minimum) / Math.max(1, maximum - minimum)) * (yEnd - yStart);
          return <g key={tick}><line x1={xStart} y1={y} x2={xEnd} y2={y} stroke="#dedbd5" strokeWidth="1"/><text x="5" y={y + 4} fontSize="14" fill="#77736d">{formatNumber(Math.round(tick))}</text></g>;
        })}
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline points={line} fill="none" stroke="#202020" strokeWidth="3.25" strokeLinejoin="round" strokeLinecap="round" />
        {lastPoint && <circle cx={lastPoint.x} cy={lastPoint.y} r="5" fill="#202020" />}
        <text x={xStart} y="246" fontSize="14" fill="#77736d">{dateLabel(firstDate)}</text>
        <text x={xEnd} y="246" fontSize="14" textAnchor="end" fill="#77736d">{dateLabel(lastDate)}</text>
      </svg>
    </div>
  );
}
