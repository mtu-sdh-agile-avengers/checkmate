import { getApiMode } from '@/config/api';
import { apiGet } from '@/lib/api-client';
import { mockFindPlayer } from '@/lib/mock-api';
import type { Player } from '@/types/chess';
import { countryLabel } from '@/utils/country';

/** Response of GET /api/v1/players/{username}/profile (backend: PlayerProfileResponse). */
export type PlayerProfileDto = {
  avatar: string | null;
  playerId: number;
  url: string;
  name: string | null;
  username: string;
  title: string | null;
  followers: number;
  countryUrl: string | null;
  location: string | null;
  lastOnline: string; // ISO date-time (UTC)
  joined: string; // ISO date-time (UTC)
  status: string;
  isStreamer: boolean;
  twitchUrl: string | null;
  verified: boolean;
  league: string | null;
  fideRating?: number | null;
};

export async function getPlayer(username: string): Promise<Player> {
  if (getApiMode() === 'mock') return mockFindPlayer(username);

  const dto = await apiGet<PlayerProfileDto>(`/players/${encodeURIComponent(username)}/profile`);
  return toPlayer(dto);
}

/** Maps the API response to the shape the profile page uses. */
export function toPlayer(dto: PlayerProfileDto): Player {
  return {
    id: String(dto.playerId),
    username: dto.username,
    url: dto.url,
    avatar: dto.avatar,
    title: dto.title,
    location: dto.location,
    country: countryLabel(dto.countryUrl),
    joined: toUnixSeconds(dto.joined) ?? 0,
    lastOnline: toUnixSeconds(dto.lastOnline),
    followers: dto.followers,
    isStreamer: dto.isStreamer,
    twitchUrl: dto.twitchUrl,
    fide: dto.fideRating ?? null,
  };
}

function toUnixSeconds(isoDate: string | null | undefined): number | null {
  const milliseconds = isoDate ? Date.parse(isoDate) : Number.NaN;
  return Number.isNaN(milliseconds) ? null : Math.floor(milliseconds / 1000);
}
