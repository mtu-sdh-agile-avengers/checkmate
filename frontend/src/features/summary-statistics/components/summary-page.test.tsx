import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { SummaryPage } from '@/features/summary-statistics/components/summary-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('summary-statistics', () => {
  it('loads demo statistics and supports changing the time frame', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SummaryPage />, { route: '/players/hikaru/summary', path: '/players/:username/summary' });
    expect(await screen.findByText('Summary statistics')).toBeInTheDocument();
    expect(await screen.findByText('55%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '7 days' }));
    expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
  });
});
