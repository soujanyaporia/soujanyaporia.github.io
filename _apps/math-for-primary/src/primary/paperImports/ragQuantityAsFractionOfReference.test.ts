import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragQuantityAsFractionOfReference';

// Read only pupil-visible text. Search for the smallest valid denominator,
// independently of the generator's greatest-common-factor calculation.
function solveVisible(q: Pick<Question, 'context' | 'prompt'>) {
  const lines = q.context ?? [];
  const whole = /^A (?:tray|jar|tin|box) holds (\d+) ([a-z]+)\.$/.exec(lines[0] ?? '');
  const group = /^(\d+) of the ([a-z]+) are ([a-z]+); all the others are ([a-z]+)\.$/.exec(lines[1] ?? '');
  const request = /^What fraction of the ([a-z]+) are ([a-z]+)\?/.exec(q.prompt);
  if (!whole || !group || !request || lines.length !== 2) {
    throw new Error('Missing or unreadable visible count givens');
  }
  if (whole[2] !== group[2] || whole[2] !== request[1]) {
    throw new Error('The requested objects do not match the givens');
  }
  const total = Number(whole[1]);
  const namedCount = Number(group[1]);
  const target = request[2] === group[3] ? namedCount
    : request[2] === group[4] ? total - namedCount : NaN;
  if (!Number.isInteger(total) || !Number.isInteger(target) || target <= 0 || target >= total) {
    throw new Error('Invalid target or reference count');
  }
  for (let denominator = 1; denominator <= total; denominator++) {
    const scaledTarget = target * denominator;
    if (scaledTarget % total === 0) {
      const numerator = scaledTarget / total;
      return {total, target, numerator, denominator, answer: `${numerator}/${denominator}`};
    }
  }
  throw new Error('No exact fraction found');
}

describe('quantity as a fraction of a reference', () => {
  it('solves visible givens across varied seeds and indices', () => {
    const seeds = [-2147483648, -31, -1, ...Array.from({length: 100}, (_, i) => i), 2147483647];
    const visibleQuestions = new Set<string>();
    const reductionCases = new Set<boolean>();
    const contexts = new Set<string>();
    for (const seed of seeds) {
      for (const index of [0, 1, 3, 8]) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(q);
        expect(q.answer).toBe(solved.answer);
        expect(solved.numerator).toBeGreaterThan(0);
        expect(solved.numerator).toBeLessThan(solved.denominator);
        expect(solved.total).toBeGreaterThanOrEqual(24);
        expect(solved.total).toBeLessThanOrEqual(60);
        expect(solved.target).toBeGreaterThanOrEqual(2);
        expect(solved.total - solved.target).toBeGreaterThanOrEqual(2);
        expect(solved.target).not.toBe(7);
        expect(q.requireSimplified).toBe(true);
        expect(q.prompt).toContain('simplest form');
        expect(q.unit).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps).toHaveLength(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toContain(`${solved.target}/${solved.total}`);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        reductionCases.add(solved.numerator !== solved.target);
        contexts.add(q.context![0].split(' ')[1]);
      }
    }
    expect(visibleQuestions.size).toBeGreaterThan(50);
    expect([...reductionCases].sort()).toEqual([false, true]);
    expect(contexts.size).toBe(4);
  });

  it('uses the existing grader to enforce a simplified fraction response', () => {
    for (let seed = 0; seed < 40; seed++) {
      const q = makeRagQuestion(seed, 2);
      const solved = solveVisible(q);
      expect(correctAnswer(q, solved.answer)).toBe(true);
      expect(correctAnswer(q, `${solved.numerator * 2}/${solved.denominator * 2}`)).toBe(false);
      expect(correctAnswer(q, `${solved.total}/${solved.target}`)).toBe(false);
      expect(correctAnswer(q, '0/0')).toBe(false);
    }
  });

  it('keeps the independent solver separate from answers and worked solutions', () => {
    const q = makeRagQuestion(731, 4);
    const expected = solveVisible(q);
    const altered: Question = {
      ...q,
      answer: '999/1000',
      hint: 'Unused by the solver',
      explanation: 'Unused by the solver',
      workedSteps: [],
      proof: 0,
    };
    expect(solveVisible(altered)).toEqual(expected);
    expect(() => solveVisible({...q, context: []})).toThrow('Missing or unreadable');
  });

  it('is reproducible and gives each seed/index pair its own key', () => {
    const keys = new Set<string>();
    for (const seed of [-9, 0, 17, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 5]) {
        const first = makeRagQuestion(seed, index);
        makeRagQuestion(seed + 1, index + 1);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        keys.add(first.key);
      }
    }
    expect(keys.size).toBe(12);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-quantity-as-fraction-of-a-reference');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.02', 'P3.S.FRAC.02']);
  });
});
