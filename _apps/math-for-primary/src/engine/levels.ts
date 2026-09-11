import { applyOp } from './equation';
import type { Rng } from './random';
import type { Fact, FactConstraints, LevelId, Op } from './types';

export interface LevelConfig {
  id: LevelId;
  /** Largest number that may appear anywhere in an addition/subtraction question. */
  max: number;
  label: string;
  short: string;
  /** Label for multiplication and division practice at this level. */
  mulLabel: string;
  /** Chance that a pure-equation question may include a zero. */
  zeroChance: number;
}

export const LEVELS: Record<LevelId, LevelConfig> = {
  1: { id: 1, max: 5, label: 'Within 5', short: '0–5', mulLabel: 'Small groups', zeroChance: 0.06 },
  2: { id: 2, max: 10, label: 'Within 10', short: '0–10', mulLabel: 'Up to 20', zeroChance: 0.05 },
  3: { id: 3, max: 20, label: 'Within 20', short: '0–20', mulLabel: 'Up to 30', zeroChance: 0.02 },
  4: { id: 4, max: 50, label: 'Within 50', short: '0–50', mulLabel: 'Up to 50', zeroChance: 0 },
  5: { id: 5, max: 100, label: 'Within 100', short: '0–100', mulLabel: 'Up to 100', zeroChance: 0 },
};

export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5];

/**
 * Multiplication and division by level. `a` is the number of groups, `b`
 * the size of each group (the "times table"). Early levels keep pictures
 * small enough to count; tables of 2, 5 and 10 come before 3 and 4, and
 * 6–9 come last (roughly P2 → P3 in Singapore).
 */
export interface MulLevel {
  a: [number, number];
  b: readonly number[];
  maxProduct: number;
}

export const MUL_LEVELS: Record<LevelId, MulLevel> = {
  1: { a: [2, 3], b: [2, 3, 4, 5], maxProduct: 10 },
  2: { a: [2, 5], b: [2, 3, 4, 5, 10], maxProduct: 20 },
  3: { a: [2, 6], b: [2, 3, 4, 5, 10], maxProduct: 30 },
  4: { a: [2, 10], b: [2, 3, 4, 5, 10], maxProduct: 50 },
  5: { a: [2, 10], b: [2, 3, 4, 5, 6, 7, 8, 9, 10], maxProduct: 100 },
};

export function toLevel(n: number): LevelId {
  return Math.min(5, Math.max(1, Math.round(n))) as LevelId;
}

export function makeFact(op: Op, a: number, b: number): Fact {
  return { a, op, b, c: applyOp(op, a, b) };
}

/** The biggest number of a fact: the sum or product, or the number we start from. */
export function wholeOf(fact: Fact): number {
  return fact.op === '+' || fact.op === '*' ? fact.c : fact.a;
}

/** Largest allowed "whole" for an operation at a level. */
export function levelWhole(level: LevelId, op: Op): number {
  return op === '+' || op === '-' ? LEVELS[level].max : MUL_LEVELS[level].maxProduct;
}

/**
 * Does the calculation cross a ten (carrying / borrowing)?
 * Making exactly 10 (e.g. 6 + 4, 10 − 3) is treated as a basic fact.
 */
export function needsRegroup(fact: Fact): boolean {
  if (fact.op === '+') return (fact.a % 10) + (fact.b % 10) >= 10 && fact.c !== 10;
  if (fact.op === '-') return fact.a % 10 < fact.b % 10 && fact.a !== 10;
  return false;
}

// ---------------------------------------------------------------- addition and subtraction

/**
 * Propose two parts [p, q] whose total fits the level.
 * p becomes the second number (b); q is the other part.
 */
function proposeParts(rng: Rng, level: LevelId): [number, number] {
  const max = LEVELS[level].max;
  if (level <= 2) {
    const whole = rng.int(level === 1 ? 2 : 3, max);
    const p = rng.int(0, whole);
    return [p, whole - p];
  }
  if (level === 3) {
    const whole = rng.chance(0.85) ? rng.int(11, 20) : rng.int(6, 10);
    const p = rng.int(1, whole - 1);
    return [p, whole - p];
  }
  const form = rng.weighted([
    ['2d1d', 45],
    ['2d2d', 40],
    ['tens', 15],
  ] as const);
  if (form === '2d1d') {
    const p = rng.int(1, 9);
    return [p, rng.int(10, max - p)];
  }
  if (form === '2d2d') {
    const p = rng.int(10, max - 20);
    return [p, rng.int(10, max - p)];
  }
  const p = rng.int(1, max / 10 - 2) * 10;
  const q = rng.chance(0.5) ? rng.int(1, (max - p) / 10) * 10 : rng.int(10, max - p);
  return [p, q];
}

function withinBounds(fact: Fact, cons: FactConstraints): boolean {
  if (cons.minA !== undefined && fact.a < cons.minA) return false;
  if (cons.maxA !== undefined && fact.a > cons.maxA) return false;
  if (cons.minB !== undefined && fact.b < cons.minB) return false;
  if (cons.maxB !== undefined && fact.b > cons.maxB) return false;
  if (cons.table !== undefined && fact.b !== cons.table) return false;
  const whole = wholeOf(fact);
  if (cons.minWhole !== undefined && whole < cons.minWhole) return false;
  if (cons.maxWhole !== undefined && whole > cons.maxWhole) return false;
  return true;
}

function acceptsAdditive(fact: Fact, level: LevelId, cons: FactConstraints, minOp: number): boolean {
  if (wholeOf(fact) > LEVELS[level].max) return false;
  if (fact.a < minOp || fact.b < minOp || fact.c < minOp) return false;
  if (!withinBounds(fact, cons)) return false;
  const regroup = needsRegroup(fact);
  if (cons.regroup === 'avoid' && regroup) return false;
  if (cons.regroup === 'require' && !regroup) return false;
  return true;
}

// ---------------------------------------------------------------- multiplication and division

function proposeMul(rng: Rng, level: LevelId, op: Op, cons: FactConstraints): Fact {
  const cfg = MUL_LEVELS[level];
  const groups = rng.int(cfg.a[0], cfg.a[1]);
  const size = cons.table ?? rng.pick(cfg.b);
  if (op === '/') return { a: groups * size, op: '/', b: size, c: groups };
  // Now and then put the table first (3 × 4 as well as 4 × 3).
  if (cons.table === undefined && level >= 3 && rng.chance(0.25)) return makeFact('*', size, groups);
  return makeFact('*', groups, size);
}

function acceptsMul(fact: Fact, level: LevelId, cons: FactConstraints): boolean {
  if (wholeOf(fact) > MUL_LEVELS[level].maxProduct) return false;
  if (fact.a < 1 || fact.b < 1 || fact.c < 1) return false;
  if (fact.op === '/' && fact.a % fact.b !== 0) return false;
  return withinBounds(fact, cons);
}

// ---------------------------------------------------------------- sampling

/**
 * Sample a true fact a op b = c that respects the level and the constraints.
 * Uses fast rejection sampling from a level-shaped distribution and falls
 * back to exhaustive enumeration, so it never returns an invalid fact.
 */
export function sampleFact(rng: Rng, level: LevelId, op: Op, cons: FactConstraints = {}): Fact {
  if (cons.fixed) {
    const fact = makeFact(op, cons.fixed.a, cons.fixed.b);
    if (fact.c < 0 || !Number.isInteger(fact.c)) {
      throw new Error(`Fixed fact is not a whole-number fact: ${JSON.stringify(cons.fixed)} (${op})`);
    }
    return fact;
  }
  if (op === '*' || op === '/') {
    for (let attempt = 0; attempt < 300; attempt++) {
      const fact = proposeMul(rng, level, op, cons);
      if (acceptsMul(fact, level, cons)) return fact;
    }
    return enumerate(level, op, rng, (f) => acceptsMul(f, level, cons), 12, cons);
  }

  const allowZero = (cons.minOperand ?? 0) <= 0 && rng.chance(LEVELS[level].zeroChance);
  const minOp = Math.max(cons.minOperand ?? 0, allowZero ? 0 : 1);
  for (let attempt = 0; attempt < 300; attempt++) {
    const [p, q] = proposeParts(rng, level);
    let fact: Fact = op === '+' ? { a: q, op, b: p, c: p + q } : { a: p + q, op, b: p, c: q };
    if (op === '+' && level >= 4 && rng.chance(0.15)) fact = { a: p, op, b: q, c: p + q };
    if (acceptsAdditive(fact, level, cons, minOp)) return fact;
  }
  return enumerate(level, op, rng, (f) => acceptsAdditive(f, level, cons, minOp), LEVELS[level].max, cons);
}

function enumerate(level: LevelId, op: Op, rng: Rng, accept: (f: Fact) => boolean, limit: number, cons: FactConstraints): Fact {
  const options: Fact[] = [];
  for (let x = 0; x <= limit; x++) {
    for (let y = 0; y <= limit; y++) {
      const fact = op === '/' ? (y === 0 ? null : { a: x * y, op, b: y, c: x }) : makeFact(op, x, y);
      if (fact && fact.c >= 0 && accept(fact)) options.push(fact);
    }
  }
  if (options.length === 0) {
    throw new Error(`No ${op} facts satisfy level ${level} with ${JSON.stringify(cons)}`);
  }
  return rng.pick(options);
}
