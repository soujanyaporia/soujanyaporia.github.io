import { useDialogFocus } from './useDialogFocus';
import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import './ui.css';

export function TopBar({
  title,
  subtitle,
  onBack,
  backIcon = 'back',
  backLabel = 'Back',
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backIcon?: IconName;
  backLabel?: string;
  right?: ReactNode;
}) {
  return (
    <header className="topbar">
      {onBack && (
        <button type="button" className="icon-btn" onClick={onBack} aria-label={backLabel} title={backLabel}>
          <Icon name={backIcon} />
        </button>
      )}
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

export type DotResult = 'star' | 'done' | undefined;

/** Progress through a session: filled dots, a star for first-try answers. */
export function ProgressDots({ total, current, results }: { total: number; current: number; results: DotResult[] }) {
  return (
    <div className="dots" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={current}>
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        const state = result ? `done ${result}` : i === current ? 'current' : '';
        return (
          <span key={i} className={`dot ${state}`}>
            {result === 'star' && <Icon name="star" size={14} filled strokeWidth={1.5} />}
          </span>
        );
      })}
    </div>
  );
}

export function Stars({ count, max = 3, size = 40, still = false }: { count: number; max?: number; size?: number; still?: boolean }) {
  return (
    <div className={`stars${still ? ' still' : ''}`} aria-label={`${count} out of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`star${i < count ? ' on' : ''}`} style={{ '--i': i } as CSSProperties}>
          <Icon name="star" size={size} filled strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}

const CONFETTI_COLOURS = ['#3f6df2', '#ff8a3d', '#1fa971', '#ffc83d', '#8b5cf6', '#0fa3a8'];

/** A short, gentle burst of confetti for finishing a lesson. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        rotate: Math.random() * 360,
        colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        round: i % 3 === 0,
      })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <span
          key={i}
          className={b.round ? 'round' : ''}
          style={
            {
              left: `${b.left}%`,
              background: b.colour,
              animationDelay: `${b.delay}s`,
              animationDuration: `${b.duration}s`,
              '--r': `${b.rotate}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Keep going',
  onConfirm,
  onCancel,
}: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useDialogFocus(true, onCancel);
  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div ref={dialogRef} className="dialog card" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {message && <p className="muted">{message}</p>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-soft" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="btn" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
