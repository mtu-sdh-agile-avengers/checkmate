import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ChessSet } from '@/components/chess/chess-set';

// The test environment has no WebGL, so these exercise the flat table the set falls back to.
describe('chess set', () => {
  it('shows the flat board with its description where 3D cannot be drawn', () => {
    const { container } = render(<ChessSet mode="computer" label="Chess board, starting position" />);
    expect(screen.getByRole('img', { name: 'Chess board, starting position' })).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelectorAll('.td-board__piece')).toHaveLength(32);
    expect(container.querySelector('.td-figure')).toBeNull();
  });

  it('seats both players in Deliberation, Player 2 showing their initial', () => {
    const { container } = render(<ChessSet mode="deliberation" label="Board" guest={{ face: 'M', avatar: null }} />);
    expect(container.querySelectorAll('.td-figure')).toHaveLength(2);
    expect(container.querySelector('.td-figure__face')).toHaveTextContent('M');
  });

  it('draws the position it is given', () => {
    const { container } = render(<ChessSet mode="computer" label="Board" placement="4k3/8/8/8/8/8/8/4K3" />);
    expect(container.querySelectorAll('.td-board__piece')).toHaveLength(2);
  });
});
