import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OpponentChair } from './stage-art';

const AVATAR = 'https://images.chesscomfiles.com/uploads/v1/user/15448422.jpeg';

describe('opponent chair', () => {
  it('is empty until a player has been found', () => {
    const { container } = render(<OpponentChair />);
    expect(container.querySelector('.opponent-guest')).toBeNull();
  });

  it('seats a guest with a question mark when the player has no picture', () => {
    const { container } = render(<OpponentChair occupied avatar={null} />);
    expect(container.querySelector('.opponent-guest text')).toHaveTextContent('?');
    expect(container.querySelector('image')).toBeNull();
  });

  it("uses the player's picture as the guest's head", () => {
    const { container } = render(<OpponentChair occupied avatar={AVATAR} />);
    expect(container.querySelector('image')).toHaveAttribute('href', AVATAR);
    expect(container.querySelector('.opponent-guest text')).toBeNull();
  });

  it('falls back to the question mark if the picture fails to load', () => {
    const { container } = render(<OpponentChair occupied avatar={AVATAR} />);
    fireEvent.error(container.querySelector('image')!);
    expect(container.querySelector('image')).toBeNull();
    expect(container.querySelector('.opponent-guest text')).toHaveTextContent('?');
  });
});
