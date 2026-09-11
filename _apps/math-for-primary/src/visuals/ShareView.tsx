import type { CSSProperties } from 'react';
import type { FamilySpec, ShareSpec } from '../engine/types';
import { factTokens } from '../engine/equation';
import { makeFact } from '../engine/levels';
import { EquationView } from '../math/EquationView';
import { ItemGlyph } from '../ui/ItemGlyph';

const Thing = ({ item, size }: { item: ShareSpec['item']; size: number }) =>
  !item || item === 'dot' ? <span className="dot-item" /> : <ItemGlyph item={item} size={size} />;

/** Division as sharing (dealing onto plates) or grouping (circling groups). */
export function ShareView({ spec }: { spec: ShareSpec }) {
  const size = spec.total > 24 ? 20 : 26;
  if (spec.mode === 'share') {
    const left = spec.total - spec.dealt;
    return (
      <div className="share-view" role="img" aria-label={`${spec.total} shared into ${spec.groups} groups`}>
        <div className={`share-pile${left === 0 ? ' empty' : ''}`}>
          {Array.from({ length: left }, (_, i) => (
            <span key={i} className="pile-item">
              <Thing item={spec.item} size={size} />
            </span>
          ))}
          {left === 0 && <span className="pile-done">All shared!</span>}
        </div>
        <div className="share-plates">
          {Array.from({ length: spec.groups }, (_, g) => {
            const count = Math.floor(spec.dealt / spec.groups) + (g < spec.dealt % spec.groups ? 1 : 0);
            return (
              <div key={g} className="share-plate">
                <div className="plate filled">
                  <div className="plate-items" style={{ '--cols': Math.min(4, Math.max(2, spec.size)) } as CSSProperties}>
                    {Array.from({ length: count }, (_, i) => (
                      <span key={i} className="plate-item" style={{ '--i': i } as CSSProperties}>
                        <Thing item={spec.item} size={size} />
                      </span>
                    ))}
                  </div>
                </div>
                <span className="group-size">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const groups = spec.total / spec.size;
  return (
    <div className="grouping-view" role="img" aria-label={`${spec.total} in groups of ${spec.size}`}>
      {Array.from({ length: groups }, (_, g) => (
        <div key={g} className={`grouping-set${g < spec.dealt ? ' circled' : ''}`} style={{ '--g': g } as CSSProperties}>
          {Array.from({ length: spec.size }, (_, i) => (
            <span key={i} className="pile-item">
              <Thing item={spec.item} size={size} />
            </span>
          ))}
          {g < spec.dealt && <span className="grouping-label">{g + 1}</span>}
        </div>
      ))}
    </div>
  );
}

/** A fact family: three numbers, four facts. */
export function FactFamily({ spec }: { spec: FamilySpec }) {
  const [p, q] = spec.parts;
  const w = spec.whole;
  const facts =
    spec.kind === 'add'
      ? [makeFact('+', p, q), makeFact('+', q, p), makeFact('-', w, p), makeFact('-', w, q)]
      : [makeFact('*', p, q), makeFact('*', q, p), makeFact('/', w, p), makeFact('/', w, q)];
  return (
    <div className="family" role="img" aria-label={`Fact family of ${p}, ${q} and ${w}`}>
      <svg viewBox="0 0 200 170" className="family-tri">
        <path d="M100 18 L182 150 H18 Z" fill="var(--tone-soft, #e9efff)" stroke="var(--tone, #4a6cf7)" strokeWidth={5} strokeLinejoin="round" />
        <circle cx={100} cy={46} r={26} fill="#fff" stroke="var(--tone, #4a6cf7)" strokeWidth={4} />
        <text x={100} y={47} className="family-num">
          {w}
        </text>
        <circle cx={52} cy={126} r={23} fill="#fff" stroke="#ff7a59" strokeWidth={4} />
        <text x={52} y={127} className="family-num">
          {p}
        </text>
        <circle cx={148} cy={126} r={23} fill="#fff" stroke="#22b07d" strokeWidth={4} />
        <text x={148} y={127} className="family-num">
          {q}
        </text>
        <text x={100} y={122} className="family-op">
          {spec.kind === 'add' ? '+ −' : '× ÷'}
        </text>
      </svg>
      <div className="family-facts">
        {facts.map((f, i) => (
          <div key={i} className={`family-fact${spec.focus === i ? ' focus' : ''}`}>
            <EquationView tokens={factTokens(f)} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
