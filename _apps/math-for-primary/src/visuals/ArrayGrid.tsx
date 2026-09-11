import type { CSSProperties } from 'react';
import type { ArraySpec } from '../engine/types';
import { ItemGlyph } from '../ui/ItemGlyph';

/**
 * An array of rows and columns. When `turned`, it rotates into place —
 * the same objects, so 3 × 4 and 4 × 3 are visibly the same amount.
 */
export function ArrayGrid({ spec }: { spec: ArraySpec }) {
  const rows = spec.turned ? spec.cols : spec.rows;
  const cols = spec.turned ? spec.rows : spec.cols;
  const item = spec.item ?? 'dot';
  const cell = Math.max(22, Math.min(40, Math.floor(320 / Math.max(rows, cols))));
  const highlight = spec.highlightRows ?? 0;
  return (
    <div className="array-wrap" role="img" aria-label={`${rows} rows of ${cols}`}>
      {spec.labels && <div className="array-top">{cols} in each row</div>}
      <div className="array-body">
        {spec.labels && <div className="array-side">{rows} rows</div>}
        <div
          key={spec.turned ? 'turned' : 'straight'}
          className={`array-grid${spec.turned ? ' turned' : ''}`}
          style={{ '--cols': cols, '--cell': `${cell}px` } as CSSProperties}
        >
          {Array.from({ length: rows }, (_, r) => (
            <div key={r} className={`array-row${r < highlight ? ' lit' : ''}`} style={{ '--r': r } as CSSProperties}>
              {Array.from({ length: cols }, (_, c) => (
                <span key={c} className="array-cell">
                  {item === 'dot' ? <span className="dot-item" /> : <ItemGlyph item={item} size={cell - 6} />}
                </span>
              ))}
              {r < highlight && <span className="array-running">{(r + 1) * cols}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
