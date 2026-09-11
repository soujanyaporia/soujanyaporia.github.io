import type { MasteryView } from '../lib/mastery';
import type { Settings } from '../state/progress';
import { Icon } from './Icon';

export function MasteryPips({ view }: { view: MasteryView }) {
  return (
    <div className="pips" aria-label={view.label} title={view.label}>
      <span className="pips-row">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className={i < view.pips ? 'on' : ''} />
        ))}
      </span>
      <span className="pips-label">{view.label}</span>
    </div>
  );
}

export function Toggle({ label, detail, checked, onChange }: { label: string; detail?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={`toggle${checked ? ' on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="toggle-text">
        <strong>{label}</strong>
        {detail && <span>{detail}</span>}
      </span>
      <span className="toggle-track">
        <span className="toggle-thumb">{checked && <Icon name="check" size={16} strokeWidth={3.2} />}</span>
      </span>
    </button>
  );
}

export function SettingsToggles({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  return (
    <div className="settings">
      <Toggle label="Sounds" detail="Soft sounds for right answers" checked={settings.sound} onChange={(sound) => onChange({ sound })} />
      <Toggle
        label="Read aloud"
        detail="Read questions and hints out loud"
        checked={settings.readAloud}
        onChange={(readAloud) => onChange({ readAloud })}
      />
    </div>
  );
}

/** The app's logo mark (matches the favicon). */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="4" y="4" width="56" height="56" rx="16" fill="#3f6df2" />
      <rect x="14" y="21" width="16" height="4.5" rx="2.25" fill="#fff" />
      <rect x="19.75" y="15.25" width="4.5" height="16" rx="2.25" fill="#fff" />
      <rect x="34" y="21" width="16" height="4.5" rx="2.25" fill="#ffd166" />
      <rect x="14" y="40" width="36" height="4.5" rx="2.25" fill="#fff" />
      <rect x="14" y="48" width="36" height="4.5" rx="2.25" fill="#fff" opacity=".55" />
    </svg>
  );
}
