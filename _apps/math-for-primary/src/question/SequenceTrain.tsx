import type { CSSProperties } from 'react';
import type { Slot } from '../engine/types';

const CARS = ['#4a6cf7', '#ff7a59', '#22b07d', '#8b5cf6', '#f5b400', '#14a3a8'];

/** The number train: each carriage carries a number; one is missing. */
export function SequenceTrain({
  terms,
  input,
  state = 'idle',
  moving = false,
}: {
  terms: Slot[];
  input: string;
  state?: 'idle' | 'active' | 'wrong' | 'correct';
  moving?: boolean;
}) {
  return (
    <div className={`train${moving ? ' moving' : ''}`} role="img" aria-label={`Number train: ${terms.map((t) => t ?? 'missing').join(', ')}`}>
      <div className="train-track" />
      <div className="train-cars">
        <div className="engine" aria-hidden="true">
          <svg viewBox="0 0 90 70" width={90} height={70}>
            <rect x={8} y={20} width={60} height={34} rx={8} fill="#e0457b" />
            <rect x={44} y={6} width={26} height={24} rx={5} fill="#b8335f" />
            <rect x={50} y={11} width={14} height={10} rx={3} fill="#cfe3ff" />
            <rect x={14} y={8} width={10} height={14} rx={3} fill="#1d2742" />
            <circle cx={24} cy={58} r={9} fill="#1d2742" />
            <circle cx={54} cy={58} r={9} fill="#1d2742" />
            <circle cx={24} cy={58} r={3} fill="#fff" />
            <circle cx={54} cy={58} r={3} fill="#fff" />
            <path d="M68 44 L84 52 L68 52 Z" fill="#b8335f" />
          </svg>
        </div>
        {terms.map((t, i) => (
          <div key={i} className={`car${t === null ? ` blank ${state}` : ''}`} style={{ '--car': CARS[i % CARS.length], '--i': i } as CSSProperties}>
            <span className="car-body">{t === null ? input || '?' : t}</span>
            <span className="car-wheels" aria-hidden="true">
              <i />
              <i />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
