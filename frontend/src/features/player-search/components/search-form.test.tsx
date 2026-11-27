import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SearchForm } from '@/features/player-search/components/search-form';
import { loadRecentPlayers, rememberPlayer } from '@/features/player-search/utils/recent-players';
import { createQueryClient } from '@/lib/query-client';
import { mockFetchJson } from '@/testing/mock-fetch';

function Profile() {
  const { username } = useParams();
  return <p>Profile of {username}</p>;
}

function renderSearch() {
  const client = createQueryClient();
  client.setDefaultOptions({ queries: { retry: false } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<SearchForm />} />
          <Route path="/players/:username" element={<Profile />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const box = () => screen.getByRole('combobox', { name: 'Chess.com username or member profile URL' });
const options = () => within(screen.getByRole('listbox', { name: 'Suggested players' })).getAllByRole('option');
const SLOW = { timeout: 5000 };

describe('account suggestions in the search', () => {
  it('suggests accounts once typing pauses: the account typed first, then titled players', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'mag');

    await waitFor(() => expect(options().map((option) => option.textContent)).toEqual(['MmagExact match', 'MmagnuscarlsenGMTitled player']), SLOW);
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveAttribute('aria-controls', screen.getByRole('listbox').id);
    expect(screen.getByRole('status')).toHaveTextContent('2 accounts suggested.');
  });

  it('moves through them with the arrows, wrapping round, and opens the one highlighted with Enter', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(box(), 'hika');
    await waitFor(() => expect(options()).toHaveLength(2), SLOW);

    await user.keyboard('{ArrowDown}');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    expect(box()).toHaveAttribute('aria-activedescendant', options()[0]?.id);
    await user.keyboard('{ArrowDown}{ArrowDown}'); // past the last: back to the first
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowUp}{ArrowUp}'); // up from the first: the last
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');

    expect(await screen.findByText('Profile of hikaru')).toBeInTheDocument();
    expect(loadRecentPlayers()[0]).toEqual({ username: 'hikaru', title: 'GM', avatar: null });
  });

  it('closes with Escape, keeping what was typed, and opens again with the arrows', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(box(), 'ann');
    await waitFor(() => expect(options()).toHaveLength(2), SLOW);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(box()).toHaveValue('ann');
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{ArrowUp}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('opens an account with a click, without taking focus from the search first', async () => {
    const user = userEvent.setup();
    renderSearch();
    await user.type(box(), 'goth');
    const account = await screen.findByRole('option', { name: /gothamchess/ }, SLOW);

    await user.hover(account);
    expect(account).toHaveAttribute('aria-selected', 'true');
    await user.click(account);

    expect(await screen.findByText('Profile of gothamchess')).toBeInTheDocument();
  });

  it('offers the players looked up before, first among the matches and when nothing is typed', async () => {
    const user = userEvent.setup();
    rememberPlayer({ username: 'magnuscarlsen', title: 'GM', avatar: null });
    renderSearch();

    await user.click(box());
    expect(options().map((option) => option.textContent)).toEqual(['MmagnuscarlsenGMRecent']);

    await user.type(box(), 'mag');
    await waitFor(() => expect(options().map((option) => option.textContent)).toEqual(['MmagExact match', 'MmagnuscarlsenGMRecent']), SLOW);

    await user.tab(); // leaving the search closes the list
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('says when it is searching and when nothing matches; Enter then looks the name up as typed', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'notfound');
    expect(screen.getByText('Searching accounts…')).toBeInTheDocument();
    expect(await screen.findByText(/No matching accounts\. Press Enter/, undefined, SLOW)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matching accounts.');
    expect(box()).toHaveAttribute('aria-expanded', 'false');

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('This profile is not in the demo data');
  });

  it('says when suggestions are unavailable, and keeps them away from profile links and single letters', async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(box(), 'error');
    expect(await screen.findByText(/Suggestions are not available right now/, undefined, SLOW)).toBeInTheDocument();

    await user.clear(box());
    await user.type(box(), 'h');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText('Searching accounts…')).not.toBeInTheDocument();
    await user.type(box(), 'ttps://www.chess.com/member/hikaru');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('asks our API for suggestions in live mode, and remembers a player found by the search itself', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const user = userEvent.setup();
    const fetchMock = mockFetchJson({
      query: 'hikaru',
      players: [{ username: 'hikaru', url: 'https://www.chess.com/member/Hikaru', avatar: 'https://images.example/h.png', title: 'GM', exact: true }],
    });
    renderSearch();

    await user.type(box(), 'hikaru');
    await waitFor(() => expect(options()).toHaveLength(1), SLOW);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/suggestions?q=hikaru', expect.anything());
    // the picture of the exact account; its initial if the picture does not load
    const picture = options()[0]?.querySelector('img');
    expect(picture).toHaveAttribute('src', 'https://images.example/h.png');
    picture?.dispatchEvent(new Event('error'));
    await waitFor(() => expect(options()[0]?.querySelector('img')).toBeNull());

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ username: 'hikaru', url: 'https://www.chess.com/member/Hikaru', avatar: null, title: 'GM' }), { status: 200 }),
    );
    await user.click(screen.getByRole('button', { name: /Search player/ }));
    expect(await screen.findByText('Profile of hikaru')).toBeInTheDocument();
    expect(loadRecentPlayers()).toEqual([{ username: 'hikaru', title: 'GM', avatar: null }]);
  });

  it('asks for no suggestions once the search is sent: the lookup goes alone', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const user = userEvent.setup();
    const fetchMock = mockFetchJson({ detail: 'No Chess.com player found for "ghost_player"' }, 404);
    renderSearch();

    await user.type(box(), 'ghost_player{Enter}'); // Enter before typing has paused

    expect(await screen.findByRole('alert')).toHaveTextContent('No Chess.com player found');
    await new Promise((resolve) => setTimeout(resolve, 500)); // well past the pause
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/?search=ghost_player', expect.anything());
  });
});
