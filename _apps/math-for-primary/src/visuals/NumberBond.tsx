import type { BondSpec, BondValue } from '../engine/types';

type NodeKey = 'whole' | 'part1' | 'part2';

const POS: Record<NodeKey, { x: number; y: number; r: number }> = {
  whole: { x: 160, y: 64, r: 50 },
  part1: { x: 74, y: 184, r: 44 },
  part2: { x: 246, y: 184, r: 44 },
};

/**
 * Singapore-style number bond: the whole on top, two parts below.
 * In a question the unknown circle doubles as the answer box.
 */
export function NumberBond({
  spec,
  input,
  active,
}: {
  spec: BondSpec;
  /** Digits typed so far, shown in the active circle. */
  input?: string;
  active?: NodeKey;
}) {
  const values: Record<NodeKey, BondValue> = { whole: spec.whole, part1: spec.parts[0], part2: spec.parts[1] };
  const node = (key: NodeKey, tone: string) => {
    const value = values[key];
    const isActive = active === key;
    const unknown = value === '?';
    const text = isActive && input !== undefined ? input : unknown ? '?' : String(value);
    const { x, y, r } = POS[key];
    const classes = ['bond-node', tone, unknown && 'unknown', spec.focus === key && 'focus', isActive && 'active', isActive && input && 'filled']
      .filter(Boolean)
      .join(' ');
    return (
      <g className={classes} key={key}>
        <circle cx={x} cy={y} r={r} />
        <text x={x} y={y + 2}>
          {text}
        </text>
      </g>
    );
  };
  const label = `Number bond: whole ${spec.whole}, parts ${spec.parts[0]} and ${spec.parts[1]}`;
  return (
    <div className="bond">
      <svg viewBox="0 0 320 240" role="img" aria-label={label}>
        <line className="bond-link" x1={POS.whole.x} y1={POS.whole.y} x2={POS.part1.x} y2={POS.part1.y} />
        <line className="bond-link" x1={POS.whole.x} y1={POS.whole.y} x2={POS.part2.x} y2={POS.part2.y} />
        {node('whole', 'tone-whole')}
        {node('part1', 'tone-part1')}
        {node('part2', 'tone-part2')}
      </svg>
    </div>
  );
}
