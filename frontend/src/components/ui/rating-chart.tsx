import { useId } from 'react';
import type { RatingPoint } from '@/types/chess';
import { formatNumber } from '@/utils/format';

/** The plot's own space: drawn stretched to whatever size the panel gives it. */
const WIDTH = 1000;
const HEIGHT = 260;

/**
 * A rating line over time. The plot (grid, fill, line) is an SVG stretched to its panel; the
 * text (rating scale, first and last date) and the marker on the latest point are HTML laid
 * over it by percentage, so they stay crisp, upright and readable at any size the panel has.
 */
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
  const span = Math.max(1, maximum - minimum);
  const plot = points.map((point, index) => ({
    x: (index / Math.max(1, points.length - 1)) * WIDTH,
    y: HEIGHT - ((point.rating - minimum) / span) * HEIGHT,
  }));
  const line = plot.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${HEIGHT} ${line} ${WIDTH},${HEIGHT}`;
  const last = plot[plot.length - 1];
  const first = points[0];
  const latest = points[points.length - 1];
  const ticks = [maximum, (minimum + maximum) / 2, minimum];
  const dateLabel = (date: string) => {
    const parsed = new Date(`${date}T12:00:00Z`);
    return parsed.toLocaleDateString('en-IE', { month: 'short', day: 'numeric', year: points.length > 30 ? 'numeric' : undefined, timeZone: 'UTC' });
  };

  return (
    <div className="chart-wrap">
      <div className="chart-heading">
        <div><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</div>
        <strong className="chart-current">{formatNumber(latest?.rating ?? 0)}</strong>
      </div>
      <div className="chart-plot">
        <div className="chart-scale" aria-hidden="true">
          {ticks.map((tick) => <span key={tick}>{formatNumber(Math.round(tick))}</span>)}
        </div>
        <div className="chart-area">
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="rating-svg" role="img" aria-label={`${title}: from ${formatNumber(first?.rating ?? 0)} to ${formatNumber(latest?.rating ?? 0)}`}>
            <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#343434" stopOpacity="0.18"/><stop offset="100%" stopColor="#343434" stopOpacity="0.012"/></linearGradient></defs>
            {[0, HEIGHT / 2, HEIGHT].map((y) => <line key={y} x1="0" y1={y} x2={WIDTH} y2={y} stroke="#d3cfc7" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            {/* Keyed by the data, so a stylesheet that animates the line (the television does) redraws it for new data. */}
            <g key={line}>
              <polygon className="rating-area" points={area} fill={`url(#${gradientId})`} />
              <polyline className="rating-line" pathLength={1} points={line} fill="none" stroke="#202020" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          </svg>
          {last && <i key={line} className="rating-dot" style={{ left: `${(last.x / WIDTH) * 100}%`, top: `${(last.y / HEIGHT) * 100}%` }} aria-hidden="true" />}
        </div>
        <div className="chart-dates" aria-hidden="true">
          <span>{dateLabel(first?.date ?? '')}</span>
          <span>{dateLabel(latest?.date ?? '')}</span>
        </div>
      </div>
    </div>
  );
}
