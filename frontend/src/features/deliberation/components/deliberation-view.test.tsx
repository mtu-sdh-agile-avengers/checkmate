import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { ComparisonState, FoundPlayer } from '@/features/deliberation/types';
import type { PlayerComparison } from '@/types/chess';
import { compareMetrics } from '@/utils/comparison';
import { DeliberationView } from './deliberation-view';

const SLOW = { timeout: 5000 };

const findPlayer = vi.fn(async (username: string): Promise<FoundPlayer> => ({
  username,
  url: `https://www.chess.com/member/${username}`,
  avatar: null,
  title: null,
}));

const COMPARISON: PlayerComparison = {
  timeClass: 'rapid',
  player1: 'hikaru',
  player2: 'magnuscarlsen',
  metrics: compareMetrics(
    { games: 1200, wins: 800, draws: 200, losses: 200, winRate: 67, currentRating: 2900, highestRating: 2950 },
    { games: 1500, wins: 900, draws: 300, losses: 300, winRate: 60, currentRating: 2836, highestRating: 2990 },
  ),
  winLikelihood: { player1: 59.1, player2: 40.9 },
  winner: 'hikaru',
};

const Router = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

/** Deliberation with a comparison the test drives: `show` hands it a new state, as the app would. */
function setup() {
  const onCompare = vi.fn();
  const onReset = vi.fn();
  const view = (comparison: ComparisonState) => (
    <DeliberationView findPlayer={findPlayer} comparison={comparison} onCompare={onCompare} onReset={onReset} />
  );
  const { rerender, container } = render(view({ status: 'idle' }), { wrapper: Router });
  return { user: userEvent.setup(), onCompare, onReset, container, show: (comparison: ComparisonState) => rerender(view(comparison)) };
}

/** Types both players, picks a time class and confirms. */
async function confirmPlayers(user: ReturnType<typeof userEvent.setup>, timeClass = 'Rapid') {
  await user.type(await screen.findByRole('textbox', { name: /Player 1/ }, SLOW), 'hikaru');
  await user.type(screen.getByRole('textbox', { name: /Player 2/ }), 'magnuscarlsen');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Compare in' }), timeClass);
  await user.click(screen.getByRole('button', { name: 'Confirm' }));
}

describe('Deliberation', () => {
  it('compares two players, deliberates, then puts the winner in the spotlight with the verdict', async () => {
    const { user, onCompare, onReset, container, show } = setup();
    await confirmPlayers(user);
    await waitFor(() => expect(onCompare).toHaveBeenCalledWith('hikaru', 'magnuscarlsen', 'rapid'), SLOW);

    // While the comparison runs: the panel with its steps and progress.
    show({ status: 'pending' });
    expect(await screen.findByRole('heading', { name: 'Deliberating…' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Comparison progress' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Steps' })).getAllByRole('listitem')[0]).toHaveAttribute('data-state', 'done');

    // The answer: the camera comes down to the table, a photograph of Player A (the winner) in the
    // spotlight, and the verdict set comes down.
    show({ status: 'success', comparison: COMPARISON });
    const heading = await screen.findByRole('heading', { name: 'hikaru wins' }, SLOW);
    expect(container.querySelector('.photo-scene')).toHaveAttribute('data-winner', 'a');
    expect(container.querySelector('.tabletop')).toHaveAttribute('data-phase', 'resolve');
    await waitFor(() => expect(heading).toHaveFocus());
    const summary = 'hikaru is the favourite in rapid, with a 59.1% expected score against magnuscarlsen.';
    expect(screen.getAllByText(summary)).toHaveLength(2); // on the set, and read out
    expect(screen.getByRole('heading', { name: 'Why hikaru' })).toBeInTheDocument();
    expect(screen.getByText('Rated 64 points higher (2,900 vs 2,836)')).toBeInTheDocument();
    const winRate = screen.getByRole('row', { name: /Win rate/ });
    expect(within(winRate).getAllByRole('cell')[0]).toHaveTextContent('67% (better)');

    // A new comparison raises the set and drops the VS set again, with both players kept.
    await user.click(screen.getByRole('button', { name: 'New comparison' }));
    expect(onReset).toHaveBeenCalledTimes(1);
    show({ status: 'idle' });
    expect(await screen.findByRole('button', { name: 'Change Player 1' }, SLOW)).toBeInTheDocument();
    expect(container.querySelector('.photo-scene')).toBeNull();
  });

  it('says so in the verdict set when the comparison fails, and tries again', async () => {
    const { user, show } = setup();
    await confirmPlayers(user, 'Blitz');
    show({ status: 'pending' });
    const retry = vi.fn();
    show({ status: 'error', message: 'Players hikaru, magnuscarlsen data is unavailable', retry });

    expect(await screen.findByRole('heading', { name: 'No verdict' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('The players could not be compared. Players hikaru, magnuscarlsen data is unavailable');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    show({ status: 'pending' });
    expect(await screen.findByRole('heading', { name: 'Deliberating…' }, SLOW)).toBeInTheDocument();
  });

  it('keeps both players at the table when it is too close to call', async () => {
    const { user, container, show } = setup();
    await confirmPlayers(user);
    show({ status: 'pending' });
    show({ status: 'success', comparison: { ...COMPARISON, winner: null, winLikelihood: { player1: 50, player2: 50 } } });

    expect(await screen.findByRole('heading', { name: 'Too close to call' }, SLOW)).toBeInTheDocument();
    expect(container.querySelector('.photo-scene')).toHaveAttribute('data-winner', 'none');
  });
});
