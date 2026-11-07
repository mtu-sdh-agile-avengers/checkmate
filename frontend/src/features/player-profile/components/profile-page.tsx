import { useState } from 'react';
import { CalendarDays, Check, Clock3, Copy, ExternalLink, Flag, Hash, MapPin, Radio, ShieldCheck, Twitch, UsersRound } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { ChessArtwork } from '@/components/chess/chess-artwork';
import { PageError, PageLoading } from '@/components/ui/page-status';
import { Panel } from '@/components/ui/panel';
import { ProfileField } from '@/features/player-profile/components/profile-field';
import { usePlayer } from '@/features/player-profile/hooks/use-player';
import { formatNumber, formatUtc } from '@/utils/format';

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
      <div className="page-title-row"><div><span className="eyebrow">04 / PLAYER LOOKUP</span><h1>Player profile</h1><p>Account details and chess identity</p></div></div>
      {isPending ? <PageLoading /> : error ? <PageError message={error.message} onRetry={() => void refetch()} /> : player ? (
        <div className="profile-layout">
          <div className="profile-main">
            <Panel className="profile-identity">
              <div className="profile-avatar" aria-label={player.avatar ? 'Player avatar' : 'No player avatar available'}>
                {player.avatar ? <img src={player.avatar} alt={`${player.username} avatar`} /> : <span className="avatar-silhouette" aria-hidden="true" />}
              </div>
              <div className="identity-copy"><span className="eyebrow">USERNAME</span><h2>{player.username} <ExternalLink size={22} aria-hidden="true" /></h2>
                <a href={player.url} target="_blank" rel="noopener noreferrer">{player.url} <ExternalLink size={14} aria-hidden="true" /></a>
                <div className="title-tag"><ShieldCheck size={16} aria-hidden="true" /> {player.title ?? 'No title listed'}</div>
              </div>
              <button type="button" className="icon-button copy-profile" aria-label={copied ? "Profile URL copied" : "Copy profile URL"} onClick={() => void copyProfile(player.url)} title="Copy profile URL">{copied ? <Check size={19} /> : <Copy size={19} />}</button>
            </Panel>
            <Panel className="profile-detail-panel">
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
            </Panel>
          </div>
          <aside className="profile-aside"><ChessArtwork variant="profile" /><p className="illustration-label">Anonymous chess identity · illustrative artwork</p></aside>
        </div>
      ) : null}
    </div>
  );
}
