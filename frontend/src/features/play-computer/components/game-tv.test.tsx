import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameTv } from '@/features/play-computer/components/game-tv';

/** The value under a label on the set, e.g. figure('Move') -> "4". */
const figure = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling?.textContent;

describe('game statistics television', () => {
  it('shows a game about to start: move 1, level material, nothing taken', () => {
    render(<GameTv fen={null} history={[]} startedAt={null} over={false} />);

    const set = screen.getByRole('complementary', { name: 'Game stats' });
    expect(within(set).getByText('CH 2 · LIVE')).toBeInTheDocument();
    expect(figure('Move')).toBe('1');
    expect(figure('Half-moves')).toBe('0');
    expect(figure('Time')).toBe('0:00');
    expect(figure('Last move')).toBe('—');
    expect(within(screen.getByRole('region', { name: 'Material' })).getByText('Level')).toBeInTheDocument();
    const you = screen.getByRole('region', { name: 'You' });
    expect(you).toHaveTextContent('White · 16 pieces');
    expect(within(you).getByText('Nothing taken yet')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Computer' })).toHaveTextContent('Black · 16 pieces');
  });

  it('follows the game: the last move and who played it, the balance, the pieces taken', () => {
    // 1. e4 d5 2. exd5 Nf6 3. Nc3 Nxd5 4. Nxd5 Qxd5 5. Bc4 Qxg2: You took a pawn and a knight,
    // the computer two pawns and a knight.
    const fen = 'rnb1kb1r/ppp1pppp/8/8/2B5/8/PPPP1PqP/R1BQK1NR w KQkq - 0 6';
    const history = ['e4', 'd5', 'exd5', 'Nf6', 'Nc3', 'Nxd5', 'Nxd5', 'Qxd5', 'Bc4', 'Qxg2'];
    const { rerender } = render(<GameTv fen={fen} history={history} startedAt={null} over={false} />);

    expect(figure('Move')).toBe('6');
    expect(figure('Half-moves')).toBe('10');
    expect(figure('Last move')).toBe('Qxg2 (computer)');
    expect(within(screen.getByRole('region', { name: 'Material' })).getByText('+1 Computer')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'You' })).getByText('Took: knight, pawn')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Computer' })).getByText('Took: knight, pawn, pawn')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'You' })).toHaveTextContent('White · 13 pieces');

    rerender(<GameTv fen={fen} history={[...history, 'Qh5']} startedAt={null} over leaving />);

    expect(figure('Last move')).toBe('Qh5 (you)');
    expect(screen.getByText('CH 2 · FINAL')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Game stats' })).toHaveAttribute('data-leaving', 'true');
  });
});
