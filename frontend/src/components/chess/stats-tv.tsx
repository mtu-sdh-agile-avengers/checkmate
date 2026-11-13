import { useState, type ReactNode } from 'react';
import './stats-tv.css';

export type TvChannel<T extends string> = { id: T; label: string };

/* The big television beside the opponent's seat. It is plain, readable HTML dressed as a
   CRT: `side` stays on screen, `children` is whatever the current channel shows. Every
   channel change replays the flicker: a burst of static while the picture tears in. The
   picture is not remounted, so controls inside it keep their state between channels.
   The channel buttons sit on the cabinet under the screen. */
export function StatsTv<T extends string>({
  label,
  channels,
  channel,
  onChannel,
  side,
  children,
}: {
  label: string;
  channels: readonly TvChannel<T>[];
  channel: T;
  onChannel: (channel: T) => void;
  side: ReactNode;
  children: ReactNode;
}) {
  // Count channel changes: the parity picks one of two identical animations, which is what
  // makes the browser restart the flicker each time.
  const [seen, setSeen] = useState({ channel, flips: 0 });
  if (seen.channel !== channel) setSeen({ channel, flips: seen.flips + 1 });

  return (
    <div className="stats-tv" data-flip={seen.flips % 2}>
      <div className="stats-tv__cabinet">
        <div className="stats-tv__screen">
          <div className="stats-tv__side">{side}</div>
          <div className="stats-tv__picture">{children}</div>
          <i className="stats-tv__static" aria-hidden="true" />
          <i className="stats-tv__glass" aria-hidden="true" />
        </div>
        <div className="stats-tv__controls">
          <span className="stats-tv__grille" aria-hidden="true" />
          <div className="stats-tv__channels" role="group" aria-label={label}>
            {channels.map(({ id, label: name }) => (
              <button type="button" key={id} aria-pressed={id === channel} onClick={() => onChannel(id)}>{name}</button>
            ))}
          </div>
          <span className="stats-tv__knobs" aria-hidden="true"><i /><i /></span>
        </div>
      </div>
      <span className="stats-tv__feet" aria-hidden="true"><i /><i /></span>
    </div>
  );
}
