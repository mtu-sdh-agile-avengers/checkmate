import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AppRouter } from '@/app/router';
import { HIKARU_BLITZ_SUMMARY } from '@/features/summary-statistics/api/get-summary.fixtures';
import { createQueryClient } from '@/lib/query-client';
import { mockFetchJson } from '@/testing/mock-fetch';

function renderApp(route: string) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>
        <AppRouter />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('router', () => {
  it('opens the statistics page instead of Overall in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(HIKARU_BLITZ_SUMMARY);

    renderApp('/players/hikaru/overall');

    expect(await screen.findByText('Summary statistics')).toBeInTheDocument();
    expect(screen.queryByText('Overall statistics')).not.toBeInTheDocument();
  });

  it('keeps the Overall page in mock mode', async () => {
    renderApp('/players/hikaru/overall');

    expect(await screen.findByText('Overall statistics')).toBeInTheDocument();
  });
});
