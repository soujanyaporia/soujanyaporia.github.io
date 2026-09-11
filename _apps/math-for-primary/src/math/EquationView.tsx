import { OP_SYMBOL } from '../engine/equation';
import type { Token } from '../engine/types';
import { speechText } from '../lib/speech';
import './math.css';

export type BlankState = 'idle' | 'active' | 'correct' | 'wrong' | 'revealed';

export function tokensToText(tokens: Token[]): string {
  return tokens
    .map((t) => {
      switch (t.t) {
        case 'num':
          return String(t.v);
        case 'op':
          return OP_SYMBOL[t.v];
        case 'rel':
          return t.v;
        case 'blank':
          return t.v === undefined || t.v === '' ? '□' : String(t.v);
        case 'text':
          return t.v;
      }
    })
    .join(' ');
}

/**
 * Big, clear maths. The blank (□) doubles as the answer box: typed digits
 * appear inside it, so the question stays the centre of attention.
 */
export function EquationView({
  tokens,
  size = 'lg',
  input,
  blankState = 'idle',
  blankShape = 'box',
  className = '',
}: {
  tokens: Token[];
  size?: 'xl' | 'lg' | 'md' | 'sm';
  /** Shown in an empty blank (typed digits or a revealed answer). */
  input?: string;
  blankState?: BlankState;
  blankShape?: 'box' | 'circle';
  className?: string;
}) {
  return (
    <div className={`eq eq-${size} ${className}`} role="math" aria-label={speechText(tokensToText(tokens))}>
      {tokens.map((t, i) => {
        switch (t.t) {
          case 'num':
            return (
              <span key={i} className={`eq-num${t.hl ? ` hl-${t.hl}` : ''}`}>
                {t.v}
              </span>
            );
          case 'op':
            return (
              <span key={i} className="eq-op">
                {OP_SYMBOL[t.v]}
              </span>
            );
          case 'rel':
            return (
              <span key={i} className="eq-op eq-rel">
                {t.v}
              </span>
            );
          case 'text':
            return (
              <span key={i} className="eq-text">
                {t.v}
              </span>
            );
          case 'blank': {
            const own = t.v !== undefined && t.v !== '';
            const value = own ? String(t.v) : input ?? '';
            const state = own && blankState === 'idle' ? (t.v === '?' ? 'ask' : 'filled') : blankState;
            return (
              <span key={i} className={`eq-blank ${blankShape} ${state}${value ? ' has-value' : ''}`}>
                {value}
                {blankState === 'active' && !own && <span className="caret" aria-hidden="true" />}
              </span>
            );
          }
        }
      })}
    </div>
  );
}
