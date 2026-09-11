import { needsRegroup } from './levels';
import type { DifficultyFeatures, Fact, Operation } from './types';

/**
 * Difficulty model. Difficulty depends on the structure of a question, not
 * only on the size of its numbers:  3 + 2 = □  <  □ + 7 = 13  <  □ − 6 = 8.
 * The score is a number from 1 (easiest) to 10.
 */

const UNKNOWN_COST: Record<DifficultyFeatures['unknown'], number> = {
  none: 0.3,
  result: 0,
  whole: 0.3,
  part: 1.0,
  second: 1.0,
  first: 1.4,
};

const EQUALITY_COST: Record<DifficultyFeatures['equalityForm'], number> = {
  standard: 0,
  reversed: 0.4,
  'both-sides': 1.5,
};

const WORDING_COST: Record<DifficultyFeatures['wording'], number> = {
  none: 0,
  simple: 0.6,
  moderate: 1.1,
  complex: 1.8,
};

const OPERATION_COST: Record<Operation, number> = {
  addition: 0,
  subtraction: 0.5,
  multiplication: 1.0,
  division: 1.5,
};

const OPERATION_OF: Record<Fact['op'], Operation> = {
  '+': 'addition',
  '-': 'subtraction',
  '*': 'multiplication',
  '/': 'division',
};

export function scoreDifficulty(f: DifficultyFeatures): number {
  let score = 1;
  score += Math.log2(Math.max(f.maxNumber, 5) / 5) * (f.operation === 'multiplication' || f.operation === 'division' ? 0.6 : 1);
  score += OPERATION_COST[f.operation];
  score += UNKNOWN_COST[f.unknown];
  if (f.operation !== 'addition' && (f.unknown === 'first' || f.unknown === 'second')) score += 0.4;
  if (f.regroup) score += 1.2;
  score += EQUALITY_COST[f.equalityForm];
  score += WORDING_COST[f.wording];
  if (f.distractor) score += 0.8;
  score += Math.max(0, f.steps - 1) * 1.2;
  if (f.construction) score += 0.8;
  if (f.comparison) score += 0.7;
  return Math.round(Math.min(10, Math.max(1, score)) * 10) / 10;
}

/** Features that follow directly from a fact; generators override the rest. */
export function featuresFor(fact: Fact, overrides: Partial<DifficultyFeatures> = {}): DifficultyFeatures {
  return {
    maxNumber: Math.max(fact.a, fact.b, fact.c),
    operation: OPERATION_OF[fact.op],
    unknown: 'result',
    regroup: needsRegroup(fact),
    equalityForm: 'standard',
    wording: 'none',
    distractor: false,
    steps: 1,
    construction: false,
    comparison: false,
    ...overrides,
  };
}
