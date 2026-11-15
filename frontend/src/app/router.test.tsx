import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AppRouter } from '@/app/router';
import { createQueryClient } from '@/lib/query-client';

// Routes are lazy and the demo data is delayed, so give lookups more than the default second,
// and the whole journey more than the default five (it types, searches and navigates twice).
const SLOW = { timeout: 5000 };
const JOURNEY_TIMEOUT = 20_000;

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

  it('sends the old statistics links to the player view', async () => {
    renderApp('/players/hikaru/overall');

    expect(await screen.findByRole('heading', { name: 'Overall statistics' }, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overall' })).toHaveAttribute('aria-pressed', 'true');
  });
});
