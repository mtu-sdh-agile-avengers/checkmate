import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MoveList } from '@/features/play-computer/components/move-list';

describe('move list', () => {
  it('says so before the first move', () => {
    render(<MoveList moves={[]} />);
    expect(screen.getByRole('heading', { name: 'Moves' })).toBeInTheDocument();
    expect(screen.getByText(/No moves yet/)).toBeInTheDocument();
  });

  it('numbers the moves in pairs, marks the newest and scrolls to it', () => {
    const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => 480 });
    try {
      const { rerender } = render(<MoveList moves={['e4', 'e5', 'Nf3']} pending />);
      const list = screen.getByRole('list', { name: 'Moves' });
      const rows = within(list).getAllByRole('listitem');
      expect(rows.map((row) => row.textContent)).toEqual(['1.e4e5', '2.Nf3']);
      expect(within(list).getByText('Nf3')).toHaveAttribute('aria-current', 'step');
      expect(within(list).getByText('Nf3')).toHaveAttribute('data-pending', 'true');
      expect(list.scrollTop).toBe(480);
      expect(list).toHaveAttribute('tabindex', '0');

      rerender(<MoveList moves={['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'O-O', 'Nf6', 'Re1', 'b5', 'Bb3', 'O-O']} />);
      expect(within(list).getAllByRole('listitem')).toHaveLength(6);
      expect(within(list).getAllByText('O-O')[1]).toHaveAttribute('data-latest', 'true');
      expect(within(list).queryByText('Nf3')).not.toHaveAttribute('data-pending');
    } finally {
      if (scrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', scrollHeight);
    }
  });
});
