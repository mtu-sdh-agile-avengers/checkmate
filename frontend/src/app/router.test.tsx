import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRouter } from '@/app/router';
import { createQueryClient } from '@/lib/query-client';

// Routes are lazy (several chunks load one after another) and the demo data is delayed, so
// lookups get far more than the default second and the tests more than the default five.
// The limits are generous on purpose: on a busy machine the whole suite runs in parallel.
const SLOW = { timeout: 15_000 };
const JOURNEY_TIMEOUT = 40_000;

/** The newest game of the demo month on the Games channel. */
async function findNewestGame() {
  const list = await screen.findByRole('list', { name: 'Games of November 2026, newest first' }, SLOW);
  const [newest] = within(list).getAllByRole('button');
  if (!newest) throw new Error('no games listed');
  return newest;
}

function renderApp(route: string) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('app router', () => {
  it('moves from the search to the single player view and back', async () => {
    const user = userEvent.setup();
    renderApp('/');

    await user.type(await screen.findByRole('searchbox', undefined, SLOW), 'hikaru');
    await user.click(screen.getByRole('button', { name: /search player/i }));

    // Profile and recent statistics share the television; Recent is the first channel.
    expect(await screen.findByRole('heading', { level: 1, name: 'Player hikaru' }, SLOW)).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Summary statistics' }, SLOW)).toBeInTheDocument();
    expect(await screen.findByText('Player ID', undefined, SLOW)).toBeInTheDocument();
    const channels = screen.getByRole('group', { name: 'Statistics on the television' });
    expect(within(channels).getByRole('button', { name: 'Recent' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(channels).getByRole('button', { name: 'Overall' }));
    expect(await screen.findByRole('heading', { name: 'Overall statistics' }, SLOW)).toBeInTheDocument();
    expect(within(channels).getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('heading', { name: 'Summary statistics' })).not.toBeInTheDocument();

    // The top bar holds nothing but Search; Back returns to the search view.
    expect(within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('link')).toHaveLength(1);
    await user.click(screen.getByRole('link', { name: /back to search/i }));
    expect(screen.queryByRole('group', { name: 'Statistics on the television' })).not.toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveFocus();
  }, JOURNEY_TIMEOUT);

  it('flicks to the Games channel, opens a game and goes back to the list', async () => {
    const user = userEvent.setup();
    renderApp('/players/hikaru');

    const channels = await screen.findByRole('group', { name: 'Statistics on the television' }, SLOW);
    await user.click(within(channels).getByRole('button', { name: 'Games' }));
    expect(within(channels).getByRole('button', { name: 'Games' })).toHaveAttribute('aria-pressed', 'true');
    const newest = await findNewestGame();
    await user.click(newest);

    // The game takes the list's place, and focus goes to it.
    expect(await screen.findByRole('heading', { name: 'mock_opponent_5 vs hikaru' }, SLOW)).toHaveFocus();
    expect(screen.queryByRole('heading', { name: 'Recent games' })).not.toBeInTheDocument();

    // Back on the list, focus returns to the game that was open.
    await user.click(screen.getByRole('button', { name: 'All games' }));
    expect(await screen.findByRole('heading', { name: 'Recent games' }, SLOW)).toBeInTheDocument();
    await waitFor(async () => expect(await findNewestGame()).toHaveFocus());
  }, JOURNEY_TIMEOUT);

  it('opens a game from a link', async () => {
    renderApp('/players/hikaru?stats=games&game=202611060&month=2026-11');

    expect(await screen.findByRole('heading', { name: 'mock_opponent_5 vs hikaru' }, SLOW)).toBeInTheDocument();
    const channels = screen.getByRole('group', { name: 'Statistics on the television' });
    expect(within(channels).getByRole('button', { name: 'Games' })).toHaveAttribute('aria-pressed', 'true');
  }, JOURNEY_TIMEOUT);

  it('sends the old statistics links to the player view', async () => {
    renderApp('/players/hikaru/overall');

    expect(await screen.findByRole('heading', { name: 'Overall statistics' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true');
  }, JOURNEY_TIMEOUT);

  it('opens In-Game Chess from the main menu, starts a game and comes back', async () => {
    const user = userEvent.setup();
    renderApp('/');

    const menu = await screen.findByRole('navigation', { name: 'Main menu' }, SLOW);
    expect(within(menu).getByRole('link', { name: '01 / Player lookup' })).toHaveAttribute('aria-current', 'page');
    await user.click(within(menu).getByRole('link', { name: '02 / In-Game Chess' }));

    // The camera is over the board: the board in its start position and the difficulty panel.
    expect(await screen.findByRole('radiogroup', { name: 'Difficulty' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Chess board, starting position' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('radio', { name: /intermediate/i })).toHaveFocus());
    await user.click(screen.getByRole('radio', { name: 'Advanced' }));
    await user.click(screen.getByRole('button', { name: 'Start game' }));

    expect(screen.getByRole('heading', { name: 'Your game' })).toHaveFocus();
    expect(screen.getByText('Advanced · Black')).toBeInTheDocument();
    expect(screen.getByText(/moves will work once the game engine is connected/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Back to menu' }));
    expect(await screen.findByRole('searchbox', undefined, SLOW)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your game' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: '02 / In-Game Chess' })).toHaveFocus());
  }, JOURNEY_TIMEOUT);

  it('opens Deliberation, pairs two players and returns with Cancel', async () => {
    const user = userEvent.setup();
    renderApp('/deliberation');

    const player1 = await screen.findByRole('textbox', { name: /Player 1/ }, SLOW);
    await user.type(player1, 'hikaru');
    await user.type(screen.getByRole('textbox', { name: /Player 2/ }), 'magnuscarlsen');
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(await screen.findByRole('heading', { name: 'hikaru vs magnuscarlsen' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /hikaru \(White\) against magnuscarlsen \(Black\)/ })).toBeInTheDocument();

    // Changing players drops the set again with both players kept; Cancel goes back to the menu.
    await user.click(screen.getByRole('button', { name: 'Change players' }));
    expect(await screen.findByRole('button', { name: 'Change Player 1' }, SLOW)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('searchbox', undefined, SLOW)).toBeInTheDocument();
  }, JOURNEY_TIMEOUT);
});
