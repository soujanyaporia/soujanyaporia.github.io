import { useEffect, useState, type CSSProperties } from 'react';
import { OP_SYMBOL } from '../engine/equation';
import type { BalanceSpec, Token } from '../engine/types';

const PIVOT = { x: 260, y: 92 };
const ARM = 188;

function tokensText(tokens: Token[]): string {
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
          return t.v === undefined ? '□' : String(t.v);
        case 'text':
          return t.v;
      }
    })
    .join(' ');
}

/**
 * A balance scale for "=": both sides the same value means the beam is level.
 * Unknown sides keep the beam level but dashed, waiting for an answer.
 */
export function Balance({ spec }: { spec: BalanceSpec }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { leftValue: l, rightValue: r } = spec;
  const known = l !== null && r !== null;
  const diff = known ? r - l : 0;
  const angle = !ready || !known || diff === 0 ? 0 : Math.sign(diff) * Math.min(9, 3 + Math.abs(diff) * 0.8);
  const drop = ARM * Math.sin((angle * Math.PI) / 180);
  const state = !known ? 'unknown' : diff === 0 ? 'balanced' : 'tipped';

  const pan = (side: 'left' | 'right', tokens: Token[], value: number | null) => {
    const x = side === 'left' ? PIVOT.x - ARM : PIVOT.x + ARM;
    const dy = side === 'left' ? -drop : drop;
    const text = tokensText(tokens);
    const signWidth = Math.max(96, text.length * 17 + 36);
    return (
      <g className="balance-pan" style={{ transform: `translateY(${dy}px)` } as CSSProperties}>
        <line x1={x} y1={PIVOT.y} x2={x - 58} y2={186} />
        <line x1={x} y1={PIVOT.y} x2={x + 58} y2={186} />
        <path className="pan-plate" d={`M${x - 76} 184 H${x + 76} Q${x + 64} 214 ${x} 214 Q${x - 64} 214 ${x - 76} 184 Z`} />
        <g className="pan-sign">
          <rect x={x - signWidth / 2} y={124} width={signWidth} height={48} rx={14} />
          <text x={x} y={149}>
            {text}
          </text>
        </g>
        <text className="pan-value" x={x} y={246}>
          {value === null ? '?' : `= ${value}`}
        </text>
      </g>
    );
  };

  return (
    <div className={`balance ${state}`}>
      <svg viewBox="0 0 520 262" role="img" aria-label={state === 'balanced' ? 'The scale is balanced' : 'A balance scale'}>
        <path className="balance-stand" d="M260 96 L232 232 H288 Z" />
        <rect className="balance-base" x={196} y={228} width={128} height={14} rx={7} />
        <g className="balance-beam" style={{ transform: `rotate(${angle}deg)` }}>
          <rect x={PIVOT.x - ARM - 14} y={PIVOT.y - 6} width={ARM * 2 + 28} height={12} rx={6} />
        </g>
        <circle className="balance-pivot" cx={PIVOT.x} cy={PIVOT.y} r={10} />
        {pan('left', spec.left, l)}
        {pan('right', spec.right, r)}
      </svg>
    </div>
  );
}
