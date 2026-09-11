import type { CSSProperties } from 'react';
import type { CounterColor, CountersSpec, ItemKind } from '../engine/types';
import { ItemGlyph } from '../ui/ItemGlyph';

interface Cell {
  color: CounterColor;
  crossed: boolean;
  /** Order in which this counter gets crossed (for a one-by-one animation). */
  crossOrder: number;
  ghost: boolean;
  number?: number;
  index: number;
}

function cellsFor(spec: CountersSpec): Cell[][] {
  let index = 0;
  return spec.groups.map((group) => {
    const crossed = group.crossed ?? 0;
    return Array.from({ length: group.count }, (_, i) => {
      const cell: Cell = {
        color: group.color,
        crossed: i >= group.count - crossed,
        crossOrder: i - (group.count - crossed),
        ghost: !!group.ghost,
        number: spec.numbered && index >= (spec.numberFrom ?? 0) ? index + 1 : undefined,
        index,
      };
      index++;
      return cell;
    });
  });
}

function Counter({ cell, item }: { cell: Cell; item?: ItemKind }) {
  const style = {
    '--pop-delay': `${Math.min(cell.index, 24) * 28}ms`,
    '--cross-delay': `${Math.max(0, cell.crossOrder) * 140}ms`,
    '--num-delay': `${cell.number !== undefined ? Math.min(cell.index, 30) * 90 : 0}ms`,
  } as CSSProperties;
  const glyph = item && item !== 'dot' && !cell.ghost;
  const classes = ['counter', `c-${cell.color}`, cell.ghost && 'ghost', cell.crossed && 'crossed', glyph && 'item'].filter(Boolean).join(' ');
  return (
    <span className={classes} style={style}>
      {glyph && <ItemGlyph item={item} />}
      {cell.number !== undefined && <b className="counter-num">{cell.number}</b>}
    </span>
  );
}

/**
 * Counters arranged like ten-frames (rows of five) so children can see
 * 5 and 10 at a glance. Keys are stable, so crossing out and colour changes
 * between steps animate instead of redrawing.
 */
export function Counters({ spec }: { spec: CountersSpec }) {
  const groups = cellsFor(spec);
  if (spec.layout === 'frame') return <TenFrames spec={spec} cells={groups.flat()} />;
  return (
    <div className="counters" role="img" aria-label={describe(spec)}>
      {spec.groups.map((group, gi) =>
        group.count === 0 ? null : (
          <div className="counter-group" key={gi}>
            <div className="counter-grid" style={{ '--cols': Math.min(5, group.count) } as CSSProperties}>
              {groups[gi].map((cell) => (
                <Counter key={cell.index} cell={cell} item={spec.item} />
              ))}
            </div>
            {group.label && <div className={`counter-label c-${group.color}${group.ghost ? ' ghost' : ''}`}>{group.label}</div>}
          </div>
        ),
      )}
    </div>
  );
}

function TenFrames({ spec, cells }: { spec: CountersSpec; cells: Cell[] }) {
  const frames = Math.max(1, Math.ceil(cells.length / 10));
  return (
    <div className="counters frames" role="img" aria-label={describe(spec)}>
      {Array.from({ length: frames }, (_, f) => (
        <div className="ten-frame" key={f}>
          {Array.from({ length: 10 }, (_, i) => {
            const cell = cells[f * 10 + i];
            return <span className="frame-slot" key={i}>{cell && <Counter cell={cell} />}</span>;
          })}
        </div>
      ))}
      <div className="frame-labels">
        {spec.groups.map((g, i) =>
          g.label ? (
            <span key={i} className={`counter-label c-${g.color}`}>
              {g.label}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

function describe(spec: CountersSpec): string {
  return spec.groups
    .filter((g) => g.count > 0)
    .map((g) => `${g.count} ${g.color} counters${g.crossed ? `, ${g.crossed} crossed out` : ''}`)
    .join(' and ');
}
