import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPlaceValueDifference';

it('solves both forms from the quantities a pupil can read', () => {
  const choicePrompts = new Set<string>();
  const entryPrompts = new Set<string>();
  for (let seed = -16; seed <= 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const grouped = /^Start at (\d+)\. Take away (\d+) hundreds, (\d+) tens and (\d+) ones\./.exec(q.prompt);
      let start: number;
      let removed: number;
      if (grouped) {
        const [given, hundreds, tens, ones] = grouped.slice(1).map(Number);
        start = given;
        removed = 100 * hundreds + 10 * tens + ones;
        expect(start).toBeGreaterThanOrEqual(1000);
        expect(start).toBeLessThan(10000);
        expect(ones).toBeGreaterThan(10);
        expect(ones).toBeLessThan(20);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(option => Number(option) === start - removed)).toHaveLength(1);
        choicePrompts.add(q.prompt);
      } else {
        const product = /product of (\d+) and (\d+)\. Take away (\d+) tens\./.exec(q.prompt);
        if (!product) throw new Error(`Missing visible factors or tens in ${q.prompt}`);
        const [factor, multiplier, tens] = product.slice(1).map(Number);
        expect(factor).toBeGreaterThanOrEqual(10);
        expect(factor).toBeLessThan(100);
        expect(multiplier).toBeGreaterThan(1);
        expect(multiplier).toBeLessThan(10);
        start = factor * multiplier;
        removed = 10 * tens;
        expect(q.choices).toBeUndefined();
        entryPrompts.add(q.prompt);
      }
      const difference = start - removed;
      expect(difference).toBeGreaterThan(0);
      expect(q.answer).toBe(String(difference));
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${start} − ${removed} = ${difference}`);
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
    }
  }
  expect(choicePrompts.size).toBeGreaterThan(10);
  expect(entryPrompts.size).toBeGreaterThan(10);
});

it('replays each item and offers both response forms at consecutive indices', () => {
  for (const seed of [-7, 0, 39, 1204]) {
    const first = makeRagQuestion(seed);
    const next = makeRagQuestion(seed, 1);
    expect(first).toEqual(makeRagQuestion(seed, 0));
    expect(next).toEqual(makeRagQuestion(seed, 1));
    expect([first, next].filter(q => q.choices)).toHaveLength(1);
  }
});
