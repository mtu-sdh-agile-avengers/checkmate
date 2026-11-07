import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OverallPage } from '@/features/overall-statistics/components/overall-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('overall-statistics', () => {
  it('shows the illustrative lifetime result and rating chart', async () => {
    renderWithProviders(<OverallPage />, { route: '/players/hikaru/overall', path: '/players/:username/overall' });
    expect(await screen.findByText('1,240')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /rating progression/i })).toBeInTheDocument();
    expect(screen.getByText('Peak rating')).toBeInTheDocument();
  });
});
