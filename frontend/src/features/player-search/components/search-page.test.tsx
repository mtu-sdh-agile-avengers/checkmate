import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query-client';
import { renderWithProviders } from '@/testing/render-with-providers';
import { SearchPage } from '@/features/player-search/components/search-page';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';

describe('player-search', () => {
  it('parses username or valid Chess.com URL and rejects unrelated URLs', () => {
    expect(parseChessUsername('Hikaru')).toBe('hikaru');
    expect(parseChessUsername('https://www.chess.com/member/Hikaru')).toBe('hikaru');
    expect(() => parseChessUsername('https://example.com/member/hikaru')).toThrow(/chess.com/i);
  });

  it('keeps the heading and a labelled search on the stage', () => {
    renderWithProviders(<SearchPage />);
    expect(screen.getByRole('heading', { level: 1, name: /find your\s*player/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Chess.com username or member profile URL')).toBe(screen.getByRole('searchbox'));
  });

  it('shows an accessible error for an invalid search', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchPage />);
    await user.type(screen.getByRole('searchbox'), 'https://example.com/member/hikaru');
    await user.click(screen.getByRole('button', { name: /search player/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Chess.com');
  });

  it('shows a plain hint without the demo player in live mode', () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    renderWithProviders(<SearchPage />);

    expect(screen.getByText(/paste a profile link/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'hikaru' })).not.toBeInTheDocument();
  });

  it('opens the player profile after a successful search', async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/players/:username" element={<p>Profile route</p>} />
            <Route path="/players/:username/summary" element={<p>Summary route</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.type(screen.getByRole('searchbox'), 'hikaru');
    await user.click(screen.getByRole('button', { name: /search player/i }));
    expect(await screen.findByText('Profile route')).toBeInTheDocument();
    expect(screen.queryByText('Summary route')).not.toBeInTheDocument();
  });
});
