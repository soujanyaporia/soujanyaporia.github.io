import { featuresFor } from '../difficulty';
import { binary, equationText, evalExpr, exprText, single } from '../equation';
import { LEVELS, makeFact, sampleFact } from '../levels';
import type { Rng } from '../random';
import type {
  Equation,
  Expr,
  Fact,
  LevelId,
  NumberProblem,
  Op,
  Relation,
  RelationProblem,
  SkillId,
  TrueFalseProblem,
} from '../types';
import { finish, type Generator } from './common';

const randomOp = (rng: Rng): Op => (rng.chance(0.5) ? '+' : '-');

// ---------------------------------------------------------------- number bonds

const bond: Generator = (rng, { level, seed, constraints }) => {
  const fact = sampleFact(rng, level, '+', { minOperand: 1, ...constraints });
  const hideWhole = level >= 2 && rng.chance(0.2);
  const hideFirst = rng.chance(0.5);
  const parts: [number | null, number | null] = hideWhole
    ? [fact.a, fact.b]
    : hideFirst
      ? [null, fact.b]
      : [fact.a, null];
  const answer = hideWhole ? fact.c : hideFirst ? fact.a : fact.b;
  const shown = hideWhole ? '?' : fact.c;
  return finish<NumberProblem>({
    id: `bond.part|${shown}:${parts.map((p) => p ?? '?').join(',')}`,
    skill: 'bond.part',
    level,
    seed,
    kind: 'number',
    format: 'bond',
    bond: { whole: hideWhole ? null : fact.c, parts },
    fact,
    answer,
    features: featuresFor(fact, { unknown: hideWhole ? 'whole' : 'part' }),
    model: 'part-whole',
    visual: 'bond',
  });
};

// ---------------------------------------------------------------- true / false

const trueFalse: Generator = (rng, { level, seed, constraints }) => {
  const op = randomOp(rng);
  const fact = sampleFact(rng, level, op, constraints);
  const max = LEVELS[level].max;
  let shown = fact.c;
  const makeTrue = rng.chance(0.5);
  if (!makeTrue) {
    const wrongOp = makeFact(op === '+' ? '-' : '+', fact.a, fact.b).c;
    const candidates = [-2, -1, 1, 2]
      .map((d) => fact.c + d)
      .concat(rng.chance(0.3) ? [wrongOp] : [])
      .filter((v) => v >= 0 && v <= max && v !== fact.c);
    shown = candidates.length ? rng.pick(candidates) : fact.c + 1;
  }
  const reversed = level >= 2 && rng.chance(0.25);
  const sum = binary(fact.a, op, fact.b);
  const equation: Equation = reversed
    ? { left: single(shown), right: sum }
    : { left: sum, right: single(shown) };
  return finish<TrueFalseProblem>({
    id: `truefalse|${equationText(equation)}`,
    skill: 'truefalse',
    level,
    seed,
    kind: 'truefalse',
    equation,
    answer: shown === fact.c,
    fact,
    features: featuresFor(fact, { unknown: 'none', equalityForm: reversed ? 'reversed' : 'standard' }),
    model: op === '+' ? 'join' : 'takeaway',
    visual: level <= 2 ? 'counters' : 'numberline',
  });
};

// ---------------------------------------------------------------- compare (<, =, >)

/** Build an expression "d op e" worth `value` within the level. */
function expressionWorth(rng: Rng, value: number, level: LevelId): Expr {
  const max = LEVELS[level].max;
  if (value >= 2 && (value >= max - 1 || rng.chance(0.6))) {
    const d = rng.int(1, value - 1);
    return binary(d, '+', value - d);
  }
  const d = rng.int(value + 1, max);
  return binary(d, '-', d - value);
}

const relationOf = (x: number, y: number): Relation => (x < y ? '<' : x > y ? '>' : '=');

const compare: Generator = (rng, { level, seed, constraints }) => {
  const op = randomOp(rng);
  const fact = sampleFact(rng, level, op, { minOperand: 1, ...constraints });
  const max = LEVELS[level].max;
  const target = rng.pick<Relation>(['<', '=', '>']);
  let other = fact.c;
  if (target !== '=') {
    const step = rng.int(1, Math.min(3, Math.max(1, Math.floor(max / 5))));
    other = target === '<' ? fact.c + step : fact.c - step;
    if (other < 0 || other > max) other = target === '<' ? fact.c - step : fact.c + step;
    if (other < 0 || other > max) other = fact.c;
  }
  const left: Expr = binary(fact.a, op, fact.b);
  const right: Expr = level >= 3 && rng.chance(0.35) ? expressionWorth(rng, other, level) : single(other);
  const swap = rng.chance(0.3);
  const [l, r] = swap ? [right, left] : [left, right];
  const answer = relationOf(evalExpr(l, 0), evalExpr(r, 0));
  return finish<RelationProblem>({
    id: `compare.expr|${exprText(l)} ? ${exprText(r)}`,
    skill: 'compare.expr',
    level,
    seed,
    kind: 'relation',
    left: l,
    right: r,
    answer,
    fact,
    features: featuresFor(fact, { unknown: 'none', comparison: true, steps: r.ops.length && l.ops.length ? 2 : 1 }),
    model: 'compare',
    visual: 'balance',
  });
};

// ---------------------------------------------------------------- equality / balance

/**
 * Equality forms, introduced gradually:
 *   6 = □ + 2        3 + 2 = 4 + □      3 + 2 = □ + 1
 *   5 + 1 = 8 − □    9 − 3 = 10 − □
 */
type BalanceForm = 'n=?+k' | 'sum=k+?' | 'sum=?+k' | 'sum=n-?' | 'diff=n-?';

interface Balance {
  equation: Equation;
  answer: number;
  /** The true fact that completes the right-hand side. */
  rightFact: Fact;
}

const equality: Generator = (rng, { level, seed }) => {
  const max = LEVELS[level].max;
  const form = rng.weighted<BalanceForm>([
    ['n=?+k', 3],
    ['sum=k+?', 4],
    ['sum=?+k', 3],
    ['sum=n-?', level >= 2 ? 2 : 0],
    ['diff=n-?', level >= 3 ? 2 : 0],
  ]);
  for (let attempt = 0; attempt < 100; attempt++) {
    const balance = buildBalance(rng, form, level, max);
    if (!balance) continue;
    const { equation, answer, rightFact } = balance;
    const numbers = [...equation.left.terms, ...equation.right.terms].map((t) => t ?? answer);
    const usesSubtraction = [...equation.left.ops, ...equation.right.ops].includes('-');
    return finish<NumberProblem>({
      id: `equality.balance|${equationText(equation)}`,
      skill: 'equality.balance',
      level,
      seed,
      kind: 'number',
      format: 'equation',
      equation,
      answer,
      fact: rightFact,
      features: featuresFor(rightFact, {
        maxNumber: Math.max(...numbers),
        operation: usesSubtraction ? 'subtraction' : 'addition',
        unknown: 'second',
        equalityForm: form === 'n=?+k' ? 'reversed' : 'both-sides',
        steps: form === 'n=?+k' ? 1 : 2,
      }),
      model: 'balance',
      visual: 'balance',
    });
  }
  throw new Error(`Could not build a balance equation for level ${level}`);
};

function buildBalance(rng: Rng, form: BalanceForm, level: LevelId, max: number): Balance | null {
  const value = rng.int(level === 1 ? 3 : 4, max);
  if (form === 'n=?+k') {
    const known = rng.int(1, value - 1);
    const answer = value - known;
    return {
      equation: { left: single(value), right: binary(null, '+', known) },
      answer,
      rightFact: makeFact('+', answer, known),
    };
  }
  let left: Expr;
  if (form === 'diff=n-?') {
    if (value >= max) return null;
    const a = rng.int(value + 1, max);
    left = binary(a, '-', a - value);
  } else {
    const p = rng.int(1, value - 1);
    left = binary(p, '+', value - p);
  }
  if (form === 'sum=n-?' || form === 'diff=n-?') {
    if (value >= max) return null;
    const n = rng.int(value + 1, max);
    // Avoid the mirror image "9 − 3 = 9 − □".
    if (left.ops[0] === '-' && left.terms[0] === n) return null;
    const answer = n - value;
    return {
      equation: { left, right: binary(n, '-', null) },
      answer,
      rightFact: makeFact('-', n, answer),
    };
  }
  const known = rng.int(1, value - 1);
  const answer = value - known;
  return form === 'sum=k+?'
    ? { equation: { left, right: binary(known, '+', null) }, answer, rightFact: makeFact('+', known, answer) }
    : { equation: { left, right: binary(null, '+', known) }, answer, rightFact: makeFact('+', answer, known) };
}

export const structureGenerators: Partial<Record<SkillId, Generator>> = {
  'bond.part': bond,
  truefalse: trueFalse,
  'compare.expr': compare,
  'equality.balance': equality,
};
