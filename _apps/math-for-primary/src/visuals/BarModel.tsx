import type { CSSProperties } from 'react';
import type { BarCell, CompareBarSpec, PartWholeBarSpec } from '../engine/types';

function Cell({ cell, tone, share }: { cell: BarCell; tone: string; share: number }) {
  return (
    <div className={`bar-cell ${tone}`} style={{ '--grow': Math.max(share, 0.06) } as CSSProperties}>
      <div className={`bar-block${cell.show ? '' : ' unknown'}`}>{cell.show ? cell.value : '?'}</div>
      {cell.label && <div className="bar-caption">{cell.label}</div>}
    </div>
  );
}

function PartWhole({ spec }: { spec: PartWholeBarSpec }) {
  const [p1, p2] = spec.parts;
  const total = p1.value + p2.value || 1;
  const hasCaptions = !!(p1.label || p2.label);
  return (
    <div
      className="bar-model"
      role="img"
      aria-label={`Bar model: whole ${spec.whole.show ? spec.whole.value : 'unknown'}, parts ${p1.show ? p1.value : 'unknown'} and ${p2.show ? p2.value : 'unknown'}`}
    >
      <div className="bar-brace">
        <span className={`bar-brace-label${spec.whole.show ? '' : ' unknown'}`}>{spec.whole.show ? spec.whole.value : '?'}</span>
        {spec.whole.label && <span className="bar-brace-caption">{spec.whole.label}</span>}
      </div>
      <div className={`bar-row${hasCaptions ? ' with-captions' : ''}`}>
        <Cell cell={p1} tone="part-a" share={p1.value / total} />
        <Cell cell={p2} tone="part-b" share={p2.value / total} />
      </div>
    </div>
  );
}

function Compare({ spec }: { spec: CompareBarSpec }) {
  const max = Math.max(1, spec.big.value);
  const named = spec.labels.some(Boolean);
  const bigRow = (
    <div className="bar-line" key="big">
      {named && <span className="bar-name">{spec.labels[0]}</span>}
      <div className="bar-track">
        <Cell cell={spec.big} tone="part-a" share={1} />
      </div>
    </div>
  );
  const smallRow = (
    <div className="bar-line" key="small">
      {named && <span className="bar-name">{spec.labels[1]}</span>}
      <div className="bar-track">
        <Cell cell={spec.small} tone="part-b" share={spec.small.value / max} />
        {spec.diff.value > 0 && <Cell cell={{ ...spec.diff, label: 'difference' }} tone="diff" share={spec.diff.value / max} />}
      </div>
    </div>
  );
  return (
    <div className={`bar-compare${named ? '' : ' no-names'}`} role="img" aria-label="Comparison bar model">
      {spec.bigFirst ? [bigRow, smallRow] : [smallRow, bigRow]}
    </div>
  );
}

/** Singapore bar model: part-whole or comparison. */
export function BarModel({ spec }: { spec: PartWholeBarSpec | CompareBarSpec }) {
  return spec.mode === 'part-whole' ? <PartWhole spec={spec} /> : <Compare spec={spec} />;
}
