import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render-with-providers';
import { GameHistoryPage } from './game-history-page';

const SLOW = { timeout: 5000 };

// Demo data (lib/mock-api): 60 games in November 2026, one every 5 hours, cycling through the
// time classes (20 of them bullet) and results.
async function findGames(month = 'November 2026') {
  const list = await screen.findByRole('list', { name: `Games of ${month}, newest first` }, SLOW);
  return within(list).getAllByRole('button');
}

describe('game history page', () => {
  it('lists the latest month of games, newest first, ten to a page', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GameHistoryPage username="hikaru" onOpen={vi.fn()} />);

    const games = await findGames();
    expect(games).toHaveLength(10);
    // The newest game of the month: a draw with Black, in bullet.
    expect(games[0]).toHaveAccessibleName(/^Draw against mock_opponent_5 \(\d+\) as Black, Bullet · 1 min, 13 Nov 2026/);
    expect(screen.getByText('November 2026 · 60 games')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 6')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Newer games' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Later month' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Older games' }));
    expect(await screen.findByText('Page 2 of 6', undefined, SLOW)).toBeInTheDocument();
  });

  it('filters by time class and steps through the months', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GameHistoryPage username="hikaru" onOpen={vi.fn()} />);
    await findGames();

    await user.selectOptions(screen.getByLabelText('Time class'), 'bullet');
    expect(await screen.findByText('November 2026 · 20 bullet games', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Earlier month' }));
    expect(await screen.findByText('October 2026 · 20 bullet games', undefined, SLOW)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Later month' }));
    expect(await screen.findByText('November 2026 · 20 bullet games', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Later month' })).toBeDisabled();
  });

  it('opens a game with its archive month', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithProviders(<GameHistoryPage username="hikaru" onOpen={onOpen} />);

    const [newest] = await findGames();
    if (!newest) throw new Error('no games listed');
    await user.click(newest);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: '202611060', archive: { year: 2026, month: 11 } }));
  });

  it('says so when a player has no games', async () => {
    renderWithProviders(<GameHistoryPage username="nogames" onOpen={vi.fn()} />);
    expect(await screen.findByText('No games on Chess.com yet.', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Earlier month' })).toBeDisabled();
  });

  it('shows the error of a failed lookup', async () => {
    renderWithProviders(<GameHistoryPage username="notfound" onOpen={vi.fn()} />);
    expect(await screen.findByRole('alert', undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
