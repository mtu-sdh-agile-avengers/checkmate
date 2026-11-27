import { Volume2, VolumeX } from 'lucide-react';
import { useSoundMuted } from '@/hooks/use-move-sounds';
import { unlockAudio } from '@/lib/sound';
import './sound-toggle.css';

/**
 * Turns the move sounds on or off (a toggle button: pressed = on). The choice is remembered
 * between visits. Turning them on is itself a click, so the audio can start right away.
 */
export function SoundToggle() {
  const [muted, setMuted] = useSoundMuted();
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={!muted}
      title={muted ? 'Move sounds are off' : 'Move sounds are on'}
      onClick={() => {
        setMuted(!muted);
        if (muted) unlockAudio();
      }}
    >
      {muted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
      <span>Sound</span>
    </button>
  );
}
