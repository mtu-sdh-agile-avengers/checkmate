import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HIKARU_GAME } from '@/features/game-details/api/get-game.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';
import { renderWithProviders } from '@/testing/render-with-providers';
import { GameDetailsPage } from './game-details-page';

const SLOW = { timeout: 5000 };

describe('game details page', () => {
  it('shows a game of the demo list: players, outcome, final position and moves', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    // The newest demo game of November 2026: a draw, hikaru with Black against mock_opponent_5.
    renderWithProviders(<GameDetailsPage username="hikaru" gameId="202611060" archive={{ year: 2026, month: 11 }} onBack={onBack} />);

    const heading = await screen.findByRole('heading', { name: 'mock_opponent_5 vs hikaru' }, SLOW);
    expect(heading).toHaveFocus();
    expect(screen.getByText('Bullet · 1 min · Rated')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Final position, hikaru playing black' })).toBeInTheDocument();
    expect(screen.getByText('Draw for hikaru')).toBeInTheDocument();
    expect(screen.getByText('Final position · 17 moves')).toBeInTheDocument();
    expect(screen.getByText('Rd8#')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view on chess\.com/i })).toHaveAttribute('href', 'https://www.chess.com/game/live/202611060');

    await user.click(screen.getByRole('button', { name: 'All games' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('reads the outcome and the moves from the PGN of a live game', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_GAME);
    renderWithProviders(<GameDetailsPage username="hikaru" gameId="186299800014" archive={{ year: 2026, month: 10 }} onBack={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Hikaru vs Sina-Movahed' }, SLOW)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/hikaru/games/?search=186299800014&year=2026&month=10', expect.anything());
    expect(screen.getByText('Hikaru won on time')).toBeInTheDocument();
    expect(screen.getByText('Final position · 2 moves')).toBeInTheDocument();
    const moves = screen.getByRole('list');
    expect(within(moves).getAllByRole('listitem').map((move) => move.textContent)).toEqual(['1.e4c5', '2.Nf3d6']);
  });

  it('shows the error of a game that cannot be found, and still goes back', async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(<GameDetailsPage username="hikaru" gameId="0" onBack={onBack} />);

    expect(await screen.findByRole('alert', undefined, SLOW)).toHaveTextContent('This game is not in the demo data');
    await user.click(screen.getByRole('button', { name: 'All games' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
