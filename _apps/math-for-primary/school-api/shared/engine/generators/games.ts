import { featuresFor } from '../difficulty';
import { applyOp } from '../equation';
import { makeFact } from '../levels';
import type { Rng } from '../random';
import type { LevelId, MakeProblem, Op, SequenceProblem, SkillId } from '../types';
import { finish, type Generator } from './common';

// ---------------------------------------------------------------- make the target ("Feed the monster")

interface MakeLevel {
  target: [number, number];
  maxCard: number;
  ops: Op[];
}

const MAKE_LEVELS: Record<LevelId, MakeLevel> = {
  1: { target: [3, 5], maxCard: 5, ops: ['+'] },
  2: { target: [6, 10], maxCard: 10, ops: ['+'] },
  3: { target: [11, 20], maxCard: 15, ops: ['+'] },
  4: { target: [6, 20], maxCard: 20, ops: ['+', '-'] },
  5: { target: [12, 40], maxCard: 20, ops: ['+', '-'] },
};

/** Every (i, j, op) that makes the target, using two different cards. */
export function makeSolutions(cards: number[], ops: Op[], target: number): [number, Op, number][] {
  const found: [number, Op, number][] = [];
  cards.forEach((x, i) =>
    cards.forEach((y, j) => {
      if (i === j) return;
      for (const op of ops) if (applyOp(op, x, y) === target) found.push([i, op, j]);
    }),
  );
  return found;
}

const makeTarget: Generator = (rng, params) => {
  const cfg = MAKE_LEVELS[params.level];
  for (let attempt = 0; attempt < 200; attempt++) {
    const target = rng.int(cfg.target[0], cfg.target[1]);
    const op = rng.pick(cfg.ops);
    let x: number;
    let y: number;
    if (op === '+') {
      x = rng.int(Math.max(1, target - cfg.maxCard), Math.min(cfg.maxCard, target - 1));
      y = target - x;
    } else if (op === '-') {
      y = rng.int(1, Math.min(cfg.maxCard, 12));
      x = target + y;
    } else {
      const factors = [2, 3, 4, 5].filter((f) => target % f === 0 && target / f <= cfg.maxCard);
      if (!factors.length) continue;
      y = rng.pick(factors);
      x = target / y;
    }
    if (x < 1 || y < 1 || x > Math.max(cfg.maxCard, target + 12) || y > cfg.maxCard) continue;
    const cards = [x, y];
    while (cards.length < 4) {
      const d = rng.int(1, cfg.maxCard);
      if (!cards.includes(d)) cards.push(d);
    }
    const shuffled = rng.shuffle(cards);
    if (makeSolutions(shuffled, cfg.ops, target).length === 0) continue;
    const fact = makeFact(op, x, y);
    return finish<MakeProblem>({
      id: `bond.make|${target}|${[...shuffled].sort((a, b) => a - b).join(',')}|${cfg.ops.join('')}`,
      skill: 'bond.make',
      level: params.level,
      seed: params.seed,
      kind: 'make',
      target,
      cards: shuffled,
      ops: cfg.ops,
      answer: target,
      fact,
      features: featuresFor(fact, { unknown: 'part', steps: cfg.ops.length > 1 ? 2 : 1 }),
      model: 'part-whole',
      visual: 'bond',
    });
  }
  throw new Error(`Could not build a make-the-target problem at level ${params.level}`);
};

// ---------------------------------------------------------------- number train (sequences)

interface SequenceLevel {
  steps: number[];
  max: number;
  fromZero?: boolean;
}

const SEQUENCE_LEVELS: Record<LevelId, SequenceLevel> = {
  1: { steps: [1], max: 10 },
  2: { steps: [1, 2, -1], max: 20 },
  3: { steps: [2, 5, 10, -2], max: 50 },
  4: { steps: [2, 3, 4, 5, 10], max: 50, fromZero: true },
  5: { steps: [3, 4, 6, 7, 8, 9, -5, -10], max: 100 },
};

export const sequenceLimit = (level: LevelId) => SEQUENCE_LEVELS[level].max;

function pickSequence(rng: Rng, level: LevelId, forcedStep?: number): { terms: number[]; step: number } {
  const cfg = SEQUENCE_LEVELS[level];
  const step = forcedStep ?? rng.pick(cfg.steps);
  const length = 5;
  const span = Math.abs(step) * (length - 1);
  let start: number;
  if (cfg.fromZero && step > 0) start = step * rng.int(0, Math.max(0, Math.floor((cfg.max - span) / step)));
  else if (step > 0) start = rng.int(0, cfg.max - span);
  else start = rng.int(span, cfg.max);
  return { terms: Array.from({ length }, (_, i) => start + i * step), step };
}

const numberTrain: Generator = (rng, params) => {
  const forced = params.constraints?.table;
  const { terms, step } = pickSequence(rng, params.level, forced);
  const blank = rng.chance(0.55) ? terms.length - 1 : rng.int(1, terms.length - 2);
  const answer = terms[blank];
  const prev = blank > 0 ? terms[blank - 1] : terms[blank + 1] - step;
  const fact = step >= 0 ? makeFact('+', prev, step) : makeFact('-', prev, -step);
  return finish<SequenceProblem>({
    id: `pattern.sequence|${terms.map((t, i) => (i === blank ? '?' : t)).join(',')}`,
    skill: 'pattern.sequence',
    level: params.level,
    seed: params.seed,
    kind: 'sequence',
    terms: terms.map((t, i) => (i === blank ? null : t)),
    step,
    answer,
    fact,
    features: featuresFor(fact, { unknown: blank === terms.length - 1 ? 'result' : 'second', steps: 2 }),
    model: 'pattern',
    visual: 'numberline',
  });
};

export const gameGenerators: Partial<Record<SkillId, Generator>> = {
  'bond.make': makeTarget,
  'pattern.sequence': numberTrain,
};
