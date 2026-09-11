import { useEffect, useRef, type CSSProperties } from 'react';
import type { NumberLineSpec } from '../engine/types';

const JUMP_MS = 520;

/**
 * Number line with animated jumps. Jumps that were already drawn in the
 * previous step stay still; only new jumps animate, so moving between
 * explanation steps feels continuous.
 */
export function NumberLine({ spec }: { spec: NumberLineSpec }) {
  const { min, max, start, jumps } = spec;
  const shown = Math.min(spec.showJumps ?? jumps.length, jumps.length);
  const signature = JSON.stringify([min, max, start, jumps]);
  const previous = useRef({ signature: '', shown: 0 });
  const animateFrom = previous.current.signature === signature ? Math.min(previous.current.shown, shown) : 0;
  useEffect(() => {
    previous.current = { signature, shown };
  }, [signature, shown]);

  const range = Math.max(1, max - min);
  const unitTicks = range <= 20;
  const width = Math.max(620, unitTicks ? (range + 1) * 50 : 1000);
  const pad = 36;
  const lineY = 150;
  const height = 205;
  const x = (v: number) => pad + ((v - min) / range) * (width - pad * 2);

  // Landing points.
  const points = [start];
  jumps.forEach((j, i) => points.push(points[i] + j));
  const end = points[points.length - 1];
  const endVisible = shown === jumps.length && jumps.length > 0 && !spec.hideEnd;

  const tickStep = unitTicks ? 1 : range <= 50 ? 5 : 10;
  const ticks: number[] = [];
  for (let v = Math.ceil(min / tickStep) * tickStep; v <= max; v += tickStep) ticks.push(v);
  const landed = new Set(points.slice(0, shown + 1));
  const labelFor = (v: number) => unitTicks || v % 10 === 0 || landed.has(v) || spec.marks?.includes(v);
  const extraLabels = unitTicks ? [] : points.slice(0, shown + 1).filter((v) => v % tickStep !== 0);

  const delayOf = (i: number) => `${Math.max(0, i - animateFrom) * JUMP_MS}ms`;
  const endDelay = `${Math.max(0, shown - animateFrom) * JUMP_MS}ms`;

  return (
    <div className="numberline">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Number line from ${min} to ${max}, starting at ${start}`}>
        <line x1={pad - 16} x2={width - pad + 16} y1={lineY} y2={lineY} className="nl-axis" />
        {ticks.map((v) => (
          <g key={v} className={labelFor(v) ? 'nl-tick labelled' : 'nl-tick'}>
            <line x1={x(v)} x2={x(v)} y1={lineY - (v % 10 === 0 ? 13 : 9)} y2={lineY + (v % 10 === 0 ? 13 : 9)} />
            {labelFor(v) && (
              <text x={x(v)} y={lineY + 42} className={`nl-label${unitTicks && range > 10 && v % 2 === 1 ? ' nl-odd' : ''}`}>
                {v}
              </text>
            )}
          </g>
        ))}
        {extraLabels.map((v) => (
          <g key={`x${v}`} className="nl-tick labelled">
            <line x1={x(v)} x2={x(v)} y1={lineY - 9} y2={lineY + 9} />
            <text x={x(v)} y={lineY + 42} className="nl-label">
              {v}
            </text>
          </g>
        ))}

        {jumps.slice(0, shown).map((j, i) => {
          const x1 = x(points[i]);
          const x2 = x(points[i + 1]);
          const span = Math.abs(x2 - x1);
          const lift = Math.min(96, Math.max(34, span * 0.55));
          const mid = (x1 + x2) / 2;
          const animate = i >= animateFrom;
          const style = { '--delay': delayOf(i) } as CSSProperties;
          const label = spec.jumpLabels ? `${j > 0 ? '+' : '−'}${Math.abs(j)}` : String(i + 1);
          // Arrowhead follows the curve's direction where it lands.
          const headAngle = (Math.atan2(lift * 2, x2 - mid) * 180) / Math.PI;
          return (
            <g key={i} className={`nl-jump${j < 0 ? ' back' : ''}${animate ? ' animate' : ''}`} style={style}>
              <path d={`M${x1} ${lineY - 4} Q${mid} ${lineY - 4 - lift * 2} ${x2} ${lineY - 4}`} pathLength={1} />
              <path
                className={`nl-head nl-arrowhead${j < 0 ? ' back' : ''}`}
                d="M-13 -7.5 L2 0 L-13 7.5 Z"
                transform={`translate(${x2} ${lineY - 4}) rotate(${headAngle})`}
              />
              <g className="nl-jump-label">
                <circle cx={mid} cy={lineY - 4 - lift - 2} r={spec.jumpLabels ? 26 : 17} />
                <text x={mid} y={lineY - 4 - lift - 2}>
                  {label}
                </text>
              </g>
            </g>
          );
        })}

        <g className="nl-start">
          <circle cx={x(start)} cy={lineY} r={14} />
        </g>
        {endVisible && (
          <g className="nl-end" style={{ '--delay': endDelay } as CSSProperties}>
            <circle cx={x(end)} cy={lineY} r={16} />
          </g>
        )}
      </svg>
    </div>
  );
}
