import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RatingChart } from './rating-chart';

const points = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    date: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
    rating: 2300 + index,
  }));

describe('rating chart', () => {
  it('says when there is no history', () => {
    render(<RatingChart points={[]} />);
    expect(screen.getByText('No rating history available.')).toBeInTheDocument();
  });

  it('draws one game and names its rating', () => {
    render(<RatingChart points={points(1)} title="Rating" />);
    expect(screen.getByRole('img', { name: 'Rating: from 2,300 to 2,300' })).toBeInTheDocument();
  });

  it('adds the year to the dates of a long history, and shows the subtitle', () => {
    const { container } = render(
      <RatingChart points={points(40)} subtitle="All available history" />,
    );
    expect(screen.getByText('All available history')).toBeInTheDocument();
    expect(container.querySelector('.chart-dates')?.textContent).toContain('2026');
  });
});
