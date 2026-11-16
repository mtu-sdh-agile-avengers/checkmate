import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HIKARU_PROFILE } from '@/features/player-profile/api/get-player.fixtures';
import { ProfilePage } from '@/features/player-profile/components/profile-page';
import { mockFetchJson } from '@/testing/mock-fetch';
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

  it('shows the real profile from the API in live mode (CMG4-69)', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(HIKARU_PROFILE);
    renderWithProviders(<ProfilePage />, { route: '/players/hikaru', path: '/players/:username' });

    expect(await screen.findByText('15448422')).toBeInTheDocument();
    expect(screen.getByText('United States (US)')).toBeInTheDocument();
    expect(screen.getByText('2,814')).toBeInTheDocument();
    expect(screen.getByText('GM')).toBeInTheDocument();
  });

  it('shows the API error message for an unknown player', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ detail: 'ghost player data is not available / does not exist' }, 404);
    renderWithProviders(<ProfilePage />, { route: '/players/ghost', path: '/players/:username' });

    expect(await screen.findByText('ghost player data is not available / does not exist')).toBeInTheDocument();
  });
});
