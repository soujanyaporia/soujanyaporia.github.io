import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragThreeFractionalShares';

it('grades the reduced sum of the three printed shares', () => {
  const sets = new Set<string>();
  const needsReduction = new Set<boolean>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const visible = [q.prompt, ...(q.context ?? []), q.display ?? ''].join(' ');
      const shares = Array.from(visible.matchAll(/(\d+)\/(\d+)/g), m => [Number(m[1]), Number(m[2])]);
      expect(shares).toHaveLength(3);
      const denominators = shares.map(([n, d]) => {
        expect(n).toBe(1);
        expect(d).toBeGreaterThan(1);
        expect(d).toBeLessThanOrEqual(12);
        return d;
      });
      const largest = Math.max(...denominators);
      expect(new Set(denominators).size).toBe(3);
      expect(denominators.every(d => largest % d === 0)).toBe(true);

      // Use the product as a denominator, then find the smallest equivalent denominator.
      const product = denominators.reduce((a, b) => a * b, 1);
      const numerator = shares.reduce((sum, [n, d]) => sum + n * (product / d), 0);
      expect(numerator).toBeLessThan(product);
      let bottom = 1;
      while ((numerator * bottom) % product !== 0) bottom++;
      const top = numerator * bottom / product;
      const expected = `${top}/${bottom}`;
      expect(q.answer).toBe(expected);
      expect(q.choices).toBeUndefined();
      expect(q.requireSimplified).toBe(true);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, `${2 * top}/${2 * bottom}`)).toBe(false);
      expect(correctAnswer(q, `${top - 1}/${bottom}`)).toBe(false);

      const count = numerator * largest / product;
      const addition = shares.map(([n, d]) => `${n * largest / d}/${largest}`).join(' + ');
      expect(q.workedSteps?.some(s => s.equation === `${addition} = ${count}/${largest}`)).toBe(true);
      sets.add([...denominators].sort((a, b) => a - b).join(','));
      needsReduction.add(bottom < largest);
    }
  }
  expect(sets.size).toBeGreaterThanOrEqual(5);
  expect(needsReduction).toEqual(new Set([true, false]));
});

it('reproduces each question and varies the visible shares across indices', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(53, index);
    expect(makeRagQuestion(53, index)).toEqual(q);
    contexts.add(q.context!.join(' '));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
