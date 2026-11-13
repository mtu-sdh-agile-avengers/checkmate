import type { PlayerProfileDto } from '@/features/player-profile/api/get-player';

// Shape of our API response for hikaru (real Chess.com snapshot used by the backend tests)
export const HIKARU_PROFILE: PlayerProfileDto = {
  avatar:
    'https://images.chesscomfiles.com/uploads/v1/user/15448422.88c010c1.200x200o.3c5619f5441e.png',
  playerId: 15448422,
  url: 'https://www.chess.com/member/Hikaru',
  name: 'Hikaru Nakamura',
  username: 'hikaru',
  title: 'GM',
  followers: 1423670,
  countryUrl: 'https://api.chess.com/pub/country/US',
  location: 'Florida',
  lastOnline: '2026-11-04T05:20:09Z',
  joined: '2014-01-06T21:20:58Z',
  status: 'premium',
  isStreamer: true,
  twitchUrl: 'https://twitch.tv/gmhikaru',
  verified: false,
  league: 'Legend',
  fideRating: 2814,
};
