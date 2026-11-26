import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FoundPlayer } from '@/features/deliberation/types';
import { PhotoScene } from './photo-scene';

const player = (username: string, avatar: string | null): FoundPlayer => ({ username, url: `https://www.chess.com/member/${username}`, avatar, title: null });
const PLAYERS = [player('hikaru', 'https://images.chesscomfiles.com/hikaru.jpeg'), player('magnuscarlsen', null)] as const;

describe('photo scene', () => {
  it('seats both players in their tones and pictures, both kings on the board, the winner marked', () => {
    const { container } = render(<PhotoScene players={PLAYERS} winner="b" quality="full" />);
    const scene = container.querySelector('.photo-scene');
    expect(scene).toHaveAttribute('data-winner', 'b');
    expect(scene).toHaveAttribute('aria-hidden', 'true');

    const [a, b] = container.querySelectorAll('.seated-figure');
    expect(a).toHaveAttribute('data-tone', 'ivory');
    expect(a?.querySelector('image')).toHaveAttribute('href', 'https://images.chesscomfiles.com/hikaru.jpeg');
    expect(b).toHaveAttribute('data-tone', 'ink');
    expect(b?.querySelector('text')).toHaveTextContent('M'); // no picture: the initial

    expect(container.querySelectorAll('.photo-set__king')).toHaveLength(2);
    expect(container.querySelectorAll('.photo-scene__dust')).toHaveLength(9);
    expect(scene).not.toHaveAttribute('data-leaving');
  });

  it('is marked leaving on the way back to the menu, to fade with the table', () => {
    const { container } = render(<PhotoScene players={PLAYERS} winner="a" quality="full" leaving />);
    expect(container.querySelector('.photo-scene')).toHaveAttribute('data-leaving', 'true');
  });

  it('falls back to the initial when a picture fails, and drops the dust on a lighter device', () => {
    const { container } = render(<PhotoScene players={PLAYERS} winner={null} quality="lite" />);
    const image = container.querySelector('.seated-figure image');
    if (!image) throw new Error('no picture');
    fireEvent.error(image);
    expect(container.querySelector('.seated-figure text')).toHaveTextContent('H');
    expect(container.querySelector('.photo-scene')).toHaveAttribute('data-winner', 'none');
    expect(container.querySelectorAll('.photo-scene__dust')).toHaveLength(0);
  });
});
