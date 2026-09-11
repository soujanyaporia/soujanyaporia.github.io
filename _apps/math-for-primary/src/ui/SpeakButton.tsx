import { canSpeak, speak } from '../lib/speech';
import { Icon } from './Icon';

/** Reads text aloud; hidden on devices without speech synthesis. */
export function SpeakButton({ text, label = 'Read aloud' }: { text: string; label?: string }) {
  if (!canSpeak) return null;
  return (
    <button type="button" className="icon-btn small speak-btn" onClick={() => speak(text)} aria-label={label} title={label}>
      <Icon name="speaker" size={22} />
    </button>
  );
}
