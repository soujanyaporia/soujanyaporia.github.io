import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragAreaRatiosKnownComponents';

// The oracle accepts only fields visible before answering.
type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Givens =
  | {kind: 'shaded'; numerator: number; denominator: number; triangle: number}
  | {kind: 'combined'; base: number; height: number; multiple: number}
  | {kind: 'component'; numerator: number; denominator: number; total: number};

function numbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens matching ${pattern}`);
  return match.slice(1).map(Number);
}

function readVisible(q: VisibleQuestion): Givens {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'What is the area of the shaded part of the card?') {
    if (!text.includes('completely inside a rectangular card') ||
        !text.includes('The triangle is unshaded and the rest of the card is shaded.')) {
      throw new Error('The shaded region is not fully specified.');
    }
    const [numerator, denominator] = numbers(text, /triangle's area is (\d+)\/(\d+) of the area of the whole card/);
    const [triangle] = numbers(text, /triangle has an area of (\d+) cm²/);
    return {kind: 'shaded', numerator, denominator, triangle};
  }
  if (q.prompt === 'What is the total area of the two pieces?') {
    if (!text.includes('two separate triangular pieces')) {
      throw new Error('The pieces must be separate for their areas to be added.');
    }
    const [base, height] = numbers(text, /Triangle Q has a base of (\d+) cm and a perpendicular height of (\d+) cm/);
    const [multiple] = numbers(text, /area of triangle P is (\d+) times the area of triangle Q/);
    return {kind: 'combined', base, height, multiple};
  }
  if (q.prompt === 'What is the area of triangle Q?') {
    if (!text.includes('P and Q cover ABC exactly, with no overlap')) {
      throw new Error('The total must be partitioned by P and Q.');
    }
    const [numerator, denominator] = numbers(text, /area of triangle P is (\d+)\/(\d+) of the area of triangle Q/);
    const [total] = numbers(text, /Triangle ABC has an area of (\d+) cm²/);
    return {kind: 'component', numerator, denominator, total};
  }
  throw new Error('Unrecognised requested area.');
}

// Enumerate possible answers and check the defining area relationships.
// No generation parameters, answer, hint, explanation or worked steps are read.
function independentAnswers(g: Givens): number[] {
  const answers: number[] = [];
  if (g.kind === 'shaded') {
    for (let shaded = 1; shaded <= g.triangle * g.denominator; shaded++) {
      const whole = shaded + g.triangle;
      if (g.numerator * whole === g.denominator * g.triangle) answers.push(shaded);
    }
  } else if (g.kind === 'combined') {
    const doubledSmallArea = g.base * g.height;
    for (let total = 1; total <= (g.multiple + 1) * doubledSmallArea; total++) {
      if (2 * total === (g.multiple + 1) * doubledSmallArea) answers.push(total);
    }
  } else {
    for (let areaQ = 1; areaQ < g.total; areaQ++) {
      const areaP = g.total - areaQ;
      if (g.denominator * areaP === g.numerator * areaQ) answers.push(areaQ);
    }
  }
  return answers;
}

function checkVisibleBounds(g: Givens): void {
  if (g.kind === 'combined') {
    expect(g.base).toBeGreaterThan(0);
    expect(g.height).toBeGreaterThan(0);
    expect(g.base * g.height % 2).toBe(0);
    expect(g.multiple).toBeGreaterThan(1);
    expect(g.multiple).toBeLessThanOrEqual(5);
    expect(g.base).not.toBe(20);
    expect(g.height).not.toBe(22);
    expect(g.multiple).not.toBe(2);
    return;
  }
  expect(g.numerator).toBeGreaterThan(0);
  expect(g.numerator).toBeLessThan(g.denominator);
  expect(g.denominator).toBeLessThanOrEqual(9);
  if (g.kind === 'shaded') {
    // Necessary geometric bound for a triangle strictly inside a rectangle.
    expect(2 * g.numerator).toBeLessThan(g.denominator);
    expect(g.triangle).toBeGreaterThan(0);
    expect(g.triangle).not.toBe(24);
  } else {
    expect(g.total).toBeGreaterThan(0);
    expect(g.total).not.toBe(72);
    expect(5 * g.numerator).not.toBe(3 * g.denominator);
  }
}

describe('area relationships from visible givens', () => {
  it('has one independently determined answer for every sampled question', () => {
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    const seeds = [-2147483648, -999, -1, 0, 1, 2, 7, 41, 9999, 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = {prompt: q.prompt, context: q.context};
        const givens = readVisible(visible);
        const solutions = independentAnswers(givens);
        kinds.add(givens.kind);
        visibleQuestions.add(JSON.stringify(visible));
        checkVisibleBounds(givens);
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(String(solutions[0]));
        expect(Number.isSafeInteger(solutions[0])).toBe(true);
        expect(q.unit).toBe('cm²');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
      }
    }
    expect([...kinds].sort()).toEqual(['combined', 'component', 'shaded']);
    expect(visibleQuestions.size).toBeGreaterThan(10);
  });

  it('checks the independent equations against hand-solvable examples', () => {
    expect(independentAnswers({kind: 'shaded', numerator: 2, denominator: 5, triangle: 18})).toEqual([27]);
    expect(independentAnswers({kind: 'combined', base: 12, height: 9, multiple: 3})).toEqual([216]);
    expect(independentAnswers({kind: 'component', numerator: 2, denominator: 3, total: 65})).toEqual([39]);
  });

  it('is reproducible and visits all variants as the index advances', () => {
    for (const seed of [-31, 0, 5, 98765]) {
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        kinds.add(readVisible({prompt: first.prompt, context: first.context}).kind);
      }
      expect(kinds.size).toBe(3);
    }
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  });
});
