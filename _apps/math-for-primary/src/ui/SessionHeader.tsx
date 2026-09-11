import type { ReactNode } from 'react';
import { Icon } from './Icon';

/** Focus-mode header: a way out, and a progress bar. Nothing else competes. */
export function SessionHeader({ onClose, progress, label, right }: { onClose: () => void; progress: number; label?: ReactNode; right?: ReactNode }) {
  return (
    <header className="session-header">
      <button type="button" className="icon-btn" onClick={onClose} aria-label="Leave">
        <Icon name="close" />
      </button>
      <div className="session-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <span className="session-fill" style={{ width: `${Math.max(3, Math.min(100, progress * 100))}%` }} />
        {label && <span className="session-label">{label}</span>}
      </div>
      {right}
    </header>
  );
}
