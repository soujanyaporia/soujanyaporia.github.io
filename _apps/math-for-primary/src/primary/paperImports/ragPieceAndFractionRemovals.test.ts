import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragPieceAndFractionRemovals';

// Find the smallest denominator that balances the visible fractions to one whole.
function solveVisible(context: string[], prompt: string) {
  const [cut, crafts, last] = context;
  const totalMatch = /into (\d+) equal pieces/.exec(cut);
  const each = /uses (\d+) pieces? on each of two kites/.exec(crafts);
  const separate = /uses (\d+) pieces? on a kite and (\d+) pieces? on a mask/.exec(crafts);
  const saved = /pieces she saves make up (\d+)\/(\d+) of the original strip/.exec(last);
  const crown = /uses (\d+)\/(\d+) of the original strip for a paper crown/.exec(last);
  const given = saved ?? crown;
  if (!totalMatch || (!each && !separate) || !given) throw new Error('Missing visible strip quantities');
  expect(Boolean(each)).toBe(!separate);
  expect(Boolean(saved)).toBe(!crown);
  expect(prompt).toContain(saved ? 'use for the crown?' : 'does Jia save?');
  const total = Number(totalMatch[1]);
  const first = Number(each ? each[1] : separate![1]);
  const second = Number(each ? each[1] : separate![2]);
  const numerator = Number(given[1]);
  const denominator = Number(given[2]);
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(12);
  expect(first).toBeGreaterThan(0);
  expect(second).toBeGreaterThan(0);
  expect(numerator).toBeGreaterThan(0);
  expect(numerator).toBeLessThan(denominator);
  expect((total * numerator) % denominator).toBe(0);
  const usedOnCrafts = first + second;
  const missing = total - usedOnCrafts - total * numerator / denominator;
  expect(missing).toBeGreaterThan(0);
  for (let bottom = 2; bottom <= total; bottom++) {
    for (let top = 1; top < bottom; top++) {
      const sum = usedOnCrafts * denominator * bottom + numerator * total * bottom + top * total * denominator;
      if (sum === total * denominator * bottom) {
        return { top, bottom, reduces: bottom < total, each: Boolean(each), inverse: Boolean(saved) };
      }
    }
  }
  throw new Error('No proper fraction balances the strip');
}

it('solves both unknowns from the story and grades the stated fraction form', () => {
  const layouts = new Set<string>();
  const reductions = new Set<boolean>();
  const answers = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { top, bottom, each, inverse, reduces } = solveVisible(q.context ?? [], q.prompt);
      const expected = `${top}/${bottom}`;
      const strict = q.prompt.includes('simplest form');
      expect(strict).toBe(inverse || !each);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, `${2 * top}/${2 * bottom}`)).toBe(!strict);
      expect(correctAnswer(q, `${top + 1}/${bottom}`)).toBe(false);
      expect(q.choices).toBeUndefined();
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
      layouts.add(`${each}-${inverse}`);
      reductions.add(reduces);
      answers.add(expected);
    }
  }
  expect(layouts.size).toBe(4);
  expect(reductions.size).toBe(2);
  expect(answers.size).toBeGreaterThan(4);
});

it('reproduces a question by seed and index and varies visible givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(q);
    stories.add(JSON.stringify(q.context));
  }
  expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  expect(stories.size).toBeGreaterThan(1);
});
