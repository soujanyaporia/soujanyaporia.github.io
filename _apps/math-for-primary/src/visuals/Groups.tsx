import type { CSSProperties } from 'react';
import type { GroupsSpec } from '../engine/types';
import { ItemGlyph } from '../ui/ItemGlyph';

/** Equal groups: plates with the same number of objects on each. */
export function Groups({ spec }: { spec: GroupsSpec }) {
  const filled = spec.filled ?? spec.groups;
  const item = spec.item ?? 'dot';
  const cols = spec.size <= 4 ? spec.size : spec.size <= 6 ? 3 : spec.size <= 9 ? 3 : 5;
  const glyph = spec.size > 6 ? 20 : 26;
  return (
    <div className="groups" role="img" aria-label={`${spec.groups} groups of ${spec.hideSize ? 'an unknown number' : spec.size}`}>
      {Array.from({ length: spec.groups }, (_, g) => (
        <div key={g} className="group" style={{ '--g': g } as CSSProperties}>
          <div className={`plate${g < filled ? ' filled' : ''}`}>
            {g < filled &&
              (spec.hideSize ? (
                <span className="plate-unknown">?</span>
              ) : (
                <div className="plate-items" style={{ '--cols': cols } as CSSProperties}>
                  {Array.from({ length: spec.size }, (_, i) => (
                    <span key={i} className="plate-item" style={{ '--i': g * spec.size + i } as CSSProperties}>
                      {item === 'dot' ? <span className="dot-item" /> : <ItemGlyph item={item} size={glyph} />}
                    </span>
                  ))}
                </div>
              ))}
          </div>
          {spec.sizes && g < filled && !spec.hideSize && <span className="group-size">{spec.size}</span>}
          {spec.totals && g < filled && <span className="group-total">{(g + 1) * spec.size}</span>}
        </div>
      ))}
    </div>
  );
}
