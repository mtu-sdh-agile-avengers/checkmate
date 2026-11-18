import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TopDownFigure } from './top-down-figure';

const AVATAR = 'https://images.chesscomfiles.com/uploads/v1/user/15448422.jpeg';

describe('top-down figure', () => {
  it('wears the hat for the visitor', () => {
    const { container } = render(<TopDownFigure tone="ink" hat face="?" />);
    expect(container.querySelector('.td-figure__face')).toBeNull();
    expect(container.querySelectorAll('circle')).toHaveLength(1); // the hat band
  });

  it("shows the player's picture, or the face letter if there is none or it fails", () => {
    const { container, rerender } = render(<TopDownFigure tone="ivory" face="H" avatar={AVATAR} />);
    expect(container.querySelector('image')).toHaveAttribute('href', AVATAR);
    fireEvent.error(container.querySelector('image')!);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('text')).toHaveTextContent('H');

    rerender(<TopDownFigure tone="ivory" face="?" avatar={null} />);
    expect(container.querySelector('text')).toHaveTextContent('?');
  });
});
