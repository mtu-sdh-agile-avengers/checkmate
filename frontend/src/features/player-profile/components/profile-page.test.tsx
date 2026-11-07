import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProfilePage } from '@/features/player-profile/components/profile-page';
import { renderWithProviders } from '@/testing/render-with-providers';

describe('player-profile', () => {
  it('displays all requested demo fields including streamer and FIDE details', async () => {
    renderWithProviders(<ProfilePage />, { route: '/players/hikaru', path: '/players/:username' });
    expect(await screen.findByText('FIDE rating')).toBeInTheDocument();
    expect(screen.getByText('2,780')).toBeInTheDocument();
    expect(screen.getByText('Streamer status')).toBeInTheDocument();
    expect(screen.getByText('Twitch URL')).toBeInTheDocument();
    expect(screen.getByText('Player ID')).toBeInTheDocument();
  });
});
