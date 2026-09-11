import type {
  ArraySpec,
  BalanceSpec,
  BarCell,
  BondSpec,
  BondValue,
  CompareBarSpec,
  CountersSpec,
  Expr,
  FamilySpec,
  GroupsSpec,
  ItemKind,
  NumberLineSpec,
  PartWholeBarSpec,
  ShareSpec,
  Token,
} from '../types';
import { evalExpr, exprTokens } from '../equation';

/** Small builders for visual specs, so explanations read like prose. */

/** Counters are only used while the picture stays countable. */
export const COUNTER_LIMIT = 20;

export function joinCounters(a: number, b: number, item?: ItemKind): CountersSpec {
  return {
    type: 'counters',
    item,
    groups: [
      { count: a, color: 'blue', label: String(a) },
      { count: b, color: 'orange', label: String(b) },
    ],
  };
}

/** `a` counters with `crossed` of the last `b` crossed out. */
export function takeAwayCounters(a: number, b: number, crossed = b, labelRest = false, item?: ItemKind): CountersSpec {
  return {
    type: 'counters',
    item,
    groups: [
      { count: a - b, color: 'blue', label: labelRest ? String(a - b) : undefined },
      { count: b, color: 'blue', crossed, label: crossed === b && b > 0 ? `− ${b}` : undefined },
    ],
  };
}

/**
 * Part-whole counters: the known part in orange, the unknown part as
 * dashed "ghosts" until revealed.
 */
export function partWholeCounters(known: number, unknown: number, reveal: boolean, knownFirst: boolean): CountersSpec {
  const knownGroup = { count: known, color: 'orange' as const, label: String(known) };
  const unknownGroup = {
    count: unknown,
    color: 'green' as const,
    ghost: !reveal,
    label: reveal ? String(unknown) : '?',
  };
  return { type: 'counters', groups: knownFirst ? [knownGroup, unknownGroup] : [unknownGroup, knownGroup] };
}

function splitJumps(delta: number): number[] {
  const sign = Math.sign(delta);
  let rest = Math.abs(delta);
  const jumps: number[] = [];
  while (rest >= 10) {
    jumps.push(10 * sign);
    rest -= 10;
  }
  if (rest > 0) jumps.push(rest * sign);
  return jumps;
}

/** A number line from `start` moving by `delta` (ones, or tens then ones). */
export function numberLine(start: number, delta: number, opts: { hideEnd?: boolean } = {}): NumberLineSpec {
  const end = start + delta;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const unit = Math.abs(delta) <= 10 && hi <= 20;
  let min: number;
  let max: number;
  if (unit) {
    max = hi <= 10 ? 10 : 20;
    min = hi <= 10 || lo < 10 ? 0 : 10;
  } else {
    min = Math.floor(lo / 10) * 10;
    max = Math.max(Math.ceil(hi / 10) * 10, min + 10);
  }
  return {
    type: 'numberline',
    min,
    max,
    start,
    jumps: unit ? Array.from({ length: Math.abs(delta) }, () => Math.sign(delta)) : splitJumps(delta),
    marks: [start],
    hideEnd: opts.hideEnd,
    jumpLabels: !unit,
  };
}

/** Skip counting: `times` jumps of `step` from `from` (0 → 4 → 8 → 12). */
export function skipLine(step: number, times: number, opts: { from?: number; hideEnd?: boolean; show?: number } = {}): NumberLineSpec {
  const start = opts.from ?? 0;
  const end = start + step * times;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const niceMax = hi <= 20 ? 20 : Math.ceil(hi / 10) * 10;
  return {
    type: 'numberline',
    min: hi <= 20 ? 0 : Math.floor(lo / 10) * 10,
    max: niceMax,
    start,
    jumps: Array.from({ length: times }, () => step),
    marks: [start],
    jumpLabels: true,
    hideEnd: opts.hideEnd,
    showJumps: opts.show,
  };
}

export function bond(whole: BondValue, parts: [BondValue, BondValue], focus?: BondSpec['focus']): BondSpec {
  return { type: 'bond', whole, parts, focus };
}

const cell = (value: number, show: boolean, label?: string): BarCell => ({ value, show, label });

export function partWholeBar(
  p1: number,
  p2: number,
  show: { p1?: boolean; p2?: boolean; whole?: boolean },
  labels: { p1?: string; p2?: string; whole?: string } = {},
): PartWholeBarSpec {
  return {
    type: 'bar',
    mode: 'part-whole',
    whole: cell(p1 + p2, show.whole ?? true, labels.whole),
    parts: [cell(p1, show.p1 ?? true, labels.p1), cell(p2, show.p2 ?? true, labels.p2)],
  };
}

export function compareBar(
  big: number,
  small: number,
  show: { big?: boolean; small?: boolean; diff?: boolean },
  labels: [string, string],
  bigFirst = true,
): CompareBarSpec {
  return {
    type: 'bar',
    mode: 'compare',
    big: cell(big, show.big ?? true),
    small: cell(small, show.small ?? true),
    diff: cell(big - small, show.diff ?? true),
    labels,
    bigFirst,
  };
}

export function balance(left: Expr, right: Expr, fill?: number, knownRight = false): BalanceSpec {
  const hasBlank = (e: Expr) => e.terms.includes(null);
  const value = (e: Expr): number | null => (hasBlank(e) ? (fill !== undefined ? evalExpr(e, fill) : null) : evalExpr(e, 0));
  const tokens = (e: Expr): Token[] => exprTokens(e, fill);
  return {
    type: 'balance',
    left: tokens(left),
    right: tokens(right),
    leftValue: value(left),
    rightValue: knownRight ? evalExpr(right, fill ?? 0) : value(right),
  };
}

// ---------------------------------------------------------------- multiplication and division

export function groupsVisual(
  groups: number,
  size: number,
  opts: { item?: ItemKind; filled?: number; totals?: boolean; sizes?: boolean; hideSize?: boolean } = {},
): GroupsSpec {
  return { type: 'groups', groups, size, ...opts };
}

export function arrayVisual(rows: number, cols: number, opts: { item?: ItemKind; turned?: boolean; labels?: boolean; highlightRows?: number } = {}): ArraySpec {
  return { type: 'array', rows, cols, labels: true, ...opts };
}

/** Deal `total` objects one at a time onto `groups` plates; `dealt` so far. */
export function shareVisual(total: number, groups: number, dealt: number, item?: ItemKind): ShareSpec {
  return { type: 'share', mode: 'share', total, groups, size: total / groups, dealt, item };
}

/** Circle groups of `size` out of `total`; `made` groups circled so far. */
export function groupingVisual(total: number, size: number, made: number, item?: ItemKind): ShareSpec {
  return { type: 'share', mode: 'group', total, groups: total / size, size, dealt: made, item };
}

export function familyVisual(kind: 'add' | 'mul', parts: [number, number], whole: number, focus?: number): FamilySpec {
  return { type: 'family', kind, parts, whole, focus };
}
