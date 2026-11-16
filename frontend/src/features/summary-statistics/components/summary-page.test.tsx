import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  HIKARU_BLITZ_SUMMARY,
  NO_GAMES_SUMMARY,
} from '@/features/summary-statistics/api/get-summary.fixtures';
import { SummaryPage } from '@/features/summary-statistics/components/summary-page';
import { mockFetchJson } from '@/testing/mock-fetch';
import { renderWithProviders } from '@/testing/render-with-providers';

const PAGE = { route: '/players/hikaru/summary', path: '/players/:username/summary' };

describe('summary-statistics', () => {
  it('loads demo statistics and supports changing the time frame', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SummaryPage />, {
      route: '/players/hikaru/summary',
      path: '/players/:username/summary',
    });
    expect(await screen.findByText('Summary statistics')).toBeInTheDocument();
    expect(await screen.findByText('55%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows real statistics from the API in live mode (CMG4-51)', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(HIKARU_BLITZ_SUMMARY);
    renderWithProviders(<SummaryPage />, PAGE);

    expect(await screen.findByText('71%')).toBeInTheDocument();
    expect(screen.getByText('3,467')).toBeInTheDocument();
    expect(screen.getByText('Change in period -30 Elo')).toBeInTheDocument();
    expect(screen.getAllByText('N/A')).toHaveLength(2); // expected rating + difference (no ML model yet)
  });

  it('shows "No games in the last X days" when the period has no games (CMG4-13)', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(NO_GAMES_SUMMARY);
    renderWithProviders(<SummaryPage />, PAGE);

    expect(await screen.findByText('No blitz games in the last 30 days.')).toBeInTheDocument();
    expect(screen.queryByText('Win rate')).not.toBeInTheDocument();
  });
});
