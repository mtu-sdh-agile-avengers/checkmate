import { useState } from 'react';
import { CalendarDays, Check, Clock3, Copy, ExternalLink, Flag, Hash, MapPin, Radio, ShieldCheck, Twitch, UsersRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { ProfileField } from '@/features/player-profile/components/profile-field';
import { usePlayer } from '@/features/player-profile/hooks/use-player';
import { formatNumber, formatUtc } from '@/utils/format';

/** Profile panel of the single player view: identity and account details. */
export function ProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const [copied, setCopied] = useState(false);
  const { data: player, isPending, error, refetch } = usePlayer(username);
  async function copyProfile(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(true); }
    catch { setCopied(false); }
  }
  return (
    <div className="profile-page">
      {isPending ? <PageLoading label="Loading profile…" /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : player ? (
        <>
          <div className="profile-identity">
            <div className="profile-avatar" aria-label={player.avatar ? 'Player avatar' : 'No player avatar available'}>
              {player.avatar ? <img src={player.avatar} alt={`${player.username} avatar`} /> : <span className="avatar-silhouette" aria-hidden="true" />}
            </div>
            <div className="identity-copy"><span className="eyebrow">PLAYER PROFILE</span><h2>{player.username}</h2>
              <a href={player.url} target="_blank" rel="noopener noreferrer">{player.url} <ExternalLink size={14} aria-hidden="true" /></a>
              <div className="title-tag"><ShieldCheck size={16} aria-hidden="true" /> {player.title ?? 'No title listed'}</div>
            </div>
          </div>
          <button type="button" className="icon-button copy-profile" onClick={() => void copyProfile(player.url)}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? 'Profile URL copied' : 'Copy profile URL'}</button>
          <div className="profile-fields">
            <ProfileField icon={Hash} label="Player ID">{player.id}</ProfileField>
            <ProfileField icon={MapPin} label="Location">{player.location ?? 'Not provided'}</ProfileField>
            <ProfileField icon={Flag} label="Country">{player.country ?? 'Not provided'}</ProfileField>
            <ProfileField icon={CalendarDays} label="Joined (UTC)">{formatUtc(player.joined)}</ProfileField>
            <ProfileField icon={Clock3} label="Last online (UTC)">{formatUtc(player.lastOnline)}</ProfileField>
            <ProfileField icon={UsersRound} label="Followers">{formatNumber(player.followers)}</ProfileField>
            <ProfileField icon={Radio} label="Streamer status">{player.isStreamer ? 'Yes' : 'No'}</ProfileField>
            <ProfileField icon={Twitch} label="Twitch URL">{player.twitchUrl ? <a href={player.twitchUrl} target="_blank" rel="noopener noreferrer">{player.twitchUrl}</a> : 'Not provided'}</ProfileField>
            <ProfileField icon={ShieldCheck} label="FIDE rating">{player.fide === null ? 'Not provided' : formatNumber(player.fide)}</ProfileField>
          </div>
        </>
      ) : null}
    </div>
  );
}
