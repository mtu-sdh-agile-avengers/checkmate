import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('overall-statistics', () => {
  it('shows the illustrative lifetime result and rating chart', async () => {
    renderWithProviders(<OverallPage />, { route: '/players/hikaru/overall', path: '/players/:username/overall' });
    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rating progression/i })).toBeInTheDocument();
    expect(screen.getByText('Peak rating')).toBeInTheDocument();
  });

  it('marks the page as demo data in live mode (no API endpoint yet)', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    renderWithProviders(<OverallPage />, { route: '/players/hikaru/overall', path: '/players/:username/overall' });

    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('not connected to the API');
  });

  it('has no demo note in mock mode', async () => {
    renderWithProviders(<OverallPage />, { route: '/players/hikaru/overall', path: '/players/:username/overall' });

    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
