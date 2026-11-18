import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HIKARU_BLITZ_ALL_TIME, NEVER_PLAYED_DAILY } from '@/features/overall-statistics/api/get-overall.fixtures';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { mockFetchJson } from '@/testing/mock-fetch';
import { renderWithProviders } from '@/testing/render-with-providers';

const PAGE = { route: '/players/hikaru/overall', path: '/players/:username/overall' };

describe('overall-statistics', () => {
  it('shows the illustrative lifetime result and rating chart in demo mode', async () => {
    renderWithProviders(<OverallPage />, PAGE);
    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rating progression/i })).toBeInTheDocument();
    expect(screen.getByText('Peak rating')).toBeInTheDocument();
    expect(screen.getByText('Average opponent')).toBeInTheDocument();
  });

  it('shows the real all-time record from the API in live mode, with no demo note', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(HIKARU_BLITZ_ALL_TIME);
    renderWithProviders(<OverallPage />, PAGE);

    expect(await screen.findByText('31,010')).toBeInTheDocument();
    expect(screen.getByText('24,518')).toBeInTheDocument();
    expect(screen.getByText('79% win rate')).toBeInTheDocument();
    expect(screen.getByText('3,467')).toBeInTheDocument();
    expect(screen.getByText('3,503')).toBeInTheDocument();
    expect(screen.getByText(/all-time stats have no rating graph/)).toBeInTheDocument();
    expect(screen.queryByText('Average opponent')).not.toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('asks again for another time class and says when it was never played', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const user = userEvent.setup();
    const fetchMock = mockFetchJson(HIKARU_BLITZ_ALL_TIME);
    renderWithProviders(<OverallPage />, PAGE);
    expect(await screen.findByText('31,010')).toBeInTheDocument();

    fetchMock.mockImplementation(async () => new Response(JSON.stringify(NEVER_PLAYED_DAILY), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await user.selectOptions(screen.getByLabelText('Time class'), 'daily');
    expect(await screen.findByText('No daily games played yet.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/players/hikaru/summary?period=all&timeClass=daily', expect.anything());
  });
});
