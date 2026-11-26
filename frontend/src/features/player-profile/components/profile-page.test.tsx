import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('shows "not provided" for a bare profile and copies the profile link', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({
      ...HIKARU_PROFILE,
      avatar: null,
      title: null,
      location: null,
      countryUrl: null,
      twitchUrl: null,
      isStreamer: false,
      fideRating: null,
      joined: null,
      lastOnline: 'not a date',
    });
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    renderWithProviders(<ProfilePage username="hikaru" />);

    expect(await screen.findByLabelText('No player avatar available')).toBeInTheDocument();
    expect(screen.getByText('No title listed')).toBeInTheDocument();
    expect(screen.getAllByText('Not provided')).toHaveLength(4); // location, country, Twitch, FIDE
    expect(screen.getByText('Unavailable')).toBeInTheDocument(); // last online
    expect(screen.getByText('No')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Copy profile URL' }));
    expect(writeText).toHaveBeenCalledWith(HIKARU_PROFILE.url);
    expect(await screen.findByRole('button', { name: 'Profile URL copied' })).toBeInTheDocument();
  });

  it('shows the silhouette when the picture fails to load, as for a player without one', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson({ ...HIKARU_PROFILE, avatar: 'https://images.chesscomfiles.com/uploads/v1/user/gone.png' });
    renderWithProviders(<ProfilePage username="hikaru" />);

    const picture = await screen.findByRole('img', { name: 'hikaru avatar' });
    expect(screen.getByLabelText('Player avatar')).toBeInTheDocument();

    fireEvent.error(picture);

    expect(screen.queryByRole('img', { name: 'hikaru avatar' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('No player avatar available')).toBeInTheDocument();
  });

  it('keeps the copy button as it was when the clipboard is blocked', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    mockFetchJson(HIKARU_PROFILE);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    renderWithProviders(<ProfilePage username="hikaru" />);

    await user.click(await screen.findByRole('button', { name: 'Copy profile URL' }));

    expect(screen.getByRole('button', { name: 'Copy profile URL' })).toBeInTheDocument();
  });
});
