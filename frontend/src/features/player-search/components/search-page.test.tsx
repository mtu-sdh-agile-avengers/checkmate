import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/testing/render-with-providers';
import { SearchPage } from '@/features/player-search/components/search-page';
import { parseChessUsername } from '@/features/player-search/utils/parse-query';

describe('player-search', () => {
  it('parses username or valid Chess.com URL and rejects unrelated URLs', () => {
    expect(parseChessUsername('Hikaru')).toBe('hikaru');
    expect(parseChessUsername('https://www.chess.com/member/Hikaru')).toBe('hikaru');
    expect(() => parseChessUsername('https://example.com/member/hikaru')).toThrow(/chess.com/i);
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
});
