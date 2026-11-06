import {describe, expect, test} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragP5CommonMultiples';

type VisibleSolution =
  | {kind: 'second'; a: number; b: number; values: number[]}
  | {kind: 'bounded'; a: number; b: number; limit: number; values: number[]};

// Only pupil-visible text is accepted. Solve by testing integers individually,
// independently of the generator's GCD, LCM, answer and random parameters.
function solveVisible(prompt: string): VisibleSolution {
  const rank = /^Put the positive common multiples of (\d+) and (\d+) in increasing order\. What is the second number\?$/.exec(prompt);
  if (rank) {
    const a = Number(rank[1]);
    const b = Number(rank[2]);
    const values: number[] = [];
    for (let n = 1; n <= 2 * a * b && values.length < 2; n++) {
      if (n % a === 0 && n % b === 0) values.push(n);
    }
    if (values.length !== 2) throw new Error('Could not find two positive common multiples');
    return {kind: 'second', a, b, values};
  }
  const bounded = /^For (\d+) and (\d+), find every positive common multiple less than (\d+)\.$/.exec(prompt);
  if (!bounded) throw new Error(`Unrecognised visible question: ${prompt}`);
  const a = Number(bounded[1]);
  const b = Number(bounded[2]);
  const limit = Number(bounded[3]);
  const values: number[] = [];
  for (let n = 1; n < limit; n++) {
    if (n % a === 0 && n % b === 0) values.push(n);
  }
  return {kind: 'bounded', a, b, limit, values};
}

function submission(solution: VisibleSolution): string {
  return solution.kind === 'second'
    ? String(solution.values[1])
    : JSON.stringify(solution.values.map(String));
}

function specimens(): Question[] {
  const result: Question[] = [];
  const seeds = [-2147483648, -1, 0, 1, 2147483647, 4294967295,
    ...Array.from({length: 64}, (_, i) => i * 97 - 2000)];
  for (const seed of seeds) {
    for (let index = 0; index < 8; index++) result.push(makeRagQuestion(seed, index));
  }
  return result;
}

describe('P5 positive common multiples', () => {
  test('answers agree with exhaustive visible-givens solving across varied seeds', () => {
    const modes = new Set<string>();
    const boundaries = new Set<string>();
    const listLengths = new Set<number>();
    const prompts = new Set<string>();
    let sawDivisiblePair = false;
    let sawSharedFactorPair = false;
    let sawCoprimePair = false;

    for (const q of specimens()) {
      const solved = solveVisible(q.prompt);
      modes.add(solved.kind);
      prompts.add(q.prompt);
      expect(solved.a).toBeGreaterThanOrEqual(2);
      expect(solved.b).toBeLessThanOrEqual(9);
      expect(solved.a).toBeLessThan(solved.b);
      expect(q.answer).toBe(submission(solved));
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);

      const sharedFactors = Array.from({length: solved.a - 1}, (_, i) => i + 2)
        .filter(n => solved.a % n === 0 && solved.b % n === 0);
      sawDivisiblePair ||= solved.b % solved.a === 0;
      sawSharedFactorPair ||= sharedFactors.length > 0 && solved.b % solved.a !== 0;
      sawCoprimePair ||= sharedFactors.length === 0;

      if (solved.kind === 'second') {
        expect(q.structuredResponse).toBeUndefined();
      } else {
        expect(solved.limit).toBeLessThanOrEqual(100);
        expect(solved.values.length).toBeGreaterThanOrEqual(2);
        expect(solved.values.length).toBeLessThanOrEqual(4);
        listLengths.add(solved.values.length);
        boundaries.add(solved.limit % solved.a === 0 && solved.limit % solved.b === 0
          ? 'common-multiple-boundary' : 'between-common-multiples');
        const spec = q.structuredResponse;
        if (!spec || spec.kind !== 'number-fields') throw new Error('Expected supported number fields');
        expect(spec.fields.length).toBe(solved.values.length);
        expect(spec.fields.every(field => !field.decimal)).toBe(true);
        expect(structuredResponseReady(spec, submission(solved))).toBe(true);
      }
    }

    expect([...modes].sort()).toEqual(['bounded', 'second']);
    expect([...boundaries].sort()).toEqual(['between-common-multiples', 'common-multiple-boundary']);
    expect([...listLengths].sort()).toEqual([2, 3, 4]);
    expect(prompts.size).toBeGreaterThan(30);
    expect(sawDivisiblePair).toBe(true);
    expect(sawSharedFactorPair).toBe(true);
    expect(sawCoprimePair).toBe(true);
  });

  test('existing grading accepts independent solutions and rejects rank, completeness and boundary mistakes', () => {
    let checkedExactBoundary = false;
    for (const q of specimens()) {
      const solved = solveVisible(q.prompt);
      expect(correctAnswer(q, submission(solved))).toBe(true);
      if (solved.kind === 'second') {
        expect(correctAnswer(q, String(solved.values[0]))).toBe(false);
        expect(correctAnswer(q, '0')).toBe(false);
        expect(correctAnswer(q, String(solved.values[1] + 1))).toBe(false);
        continue;
      }

      const values = solved.values.map(String);
      expect(correctAnswer(q, JSON.stringify(values.slice(0, -1)))).toBe(false);
      expect(correctAnswer(q, JSON.stringify([...values, values[0]]))).toBe(false);
      expect(correctAnswer(q, JSON.stringify([...values].reverse()))).toBe(false);
      const duplicated = [...values];
      duplicated[1] = duplicated[0];
      expect(correctAnswer(q, JSON.stringify(duplicated))).toBe(false);
      const withZero = [...values];
      withZero[0] = '0';
      expect(correctAnswer(q, JSON.stringify(withZero))).toBe(false);
      // A comma-joined list must not be mistaken for a single numeric answer.
      expect(correctAnswer(q, values.join(','))).toBe(false);

      if (solved.limit % solved.a === 0 && solved.limit % solved.b === 0) {
        checkedExactBoundary = true;
        const includingLimit = [...values];
        includingLimit[includingLimit.length - 1] = String(solved.limit);
        expect(correctAnswer(q, JSON.stringify(includingLimit))).toBe(false);
      }
    }
    expect(checkedExactBoundary).toBe(true);
  });

  test('metadata and deterministic seed/index behaviour remain stable', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-common-multiples');
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.FACT.03']);
    expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
    for (const seed of [-17, 0, 42, 987654321]) {
      const original = makeRagQuestion(seed, 3);
      makeRagQuestion(seed + 1, 8);
      expect(makeRagQuestion(seed, 3)).toEqual(original);
      const indexed = Array.from({length: 24}, (_, index) => makeRagQuestion(seed, index));
      expect(new Set(indexed.map(q => q.key)).size).toBe(24);
      expect(new Set(indexed.map(q => solveVisible(q.prompt).kind)).size).toBe(2);
      expect(new Set(indexed.map(q => q.prompt)).size).toBeGreaterThan(4);
    }
  });
});
