import { describe, expect, it, vi } from 'vitest';
import { getPlayer, toPlayer } from '@/features/player-profile/api/get-player';
import { HIKARU_PROFILE } from '@/features/player-profile/api/get-player.fixtures';
import { mockFetchJson } from '@/testing/mock-fetch';

describe('player-profile api', () => {
  it('maps the API response to the profile page data', () => {
    expect(toPlayer(HIKARU_PROFILE)).toEqual({
      id: '15448422',
      username: 'hikaru',
      url: 'https://www.chess.com/member/Hikaru',
      avatar: HIKARU_PROFILE.avatar,
      title: 'GM',
      location: 'Florida',
      country: 'United States (US)',
      joined: 1389043258,
      lastOnline: Date.parse('2026-11-04T05:20:09Z') / 1000,
      followers: 1423670,
      isStreamer: true,
      twitchUrl: 'https://twitch.tv/gmhikaru',
      fide: 2814,
    });
  });

  it('keeps missing optional fields empty', () => {
    const player = toPlayer({
      ...HIKARU_PROFILE,
      countryUrl: null,
      title: null,
      fideRating: null,
      twitchUrl: null,
    });

    expect(player).toMatchObject({ country: null, title: null, fide: null, twitchUrl: null });
  });

  it('labels Chess.com regions that are not ISO countries', () => {
    expect(
      toPlayer({ ...HIKARU_PROFILE, countryUrl: 'https://api.chess.com/pub/country/XE' }).country,
    ).toBe('England (XE)');
  });

  it('calls the profile endpoint in live mode', async () => {
    vi.stubEnv('VITE_API_MODE', 'live');
    const fetchMock = mockFetchJson(HIKARU_PROFILE);

    const player = await getPlayer('hikaru');

    expect(player.fide).toBe(2814);
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/players/hikaru/profile', expect.anything());
  });

  it('uses demo data in mock mode without calling the API', async () => {
    const fetchMock = mockFetchJson({});

    const player = await getPlayer('hikaru');

    expect(player.fide).toBe(2780); // demo value
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
