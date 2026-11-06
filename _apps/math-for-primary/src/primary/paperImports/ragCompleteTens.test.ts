import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragCompleteTens';

it('solves the displayed box by counting all tens, including those in the hundreds', () => {
  const productTotals = new Set<number>();
  const entryTotals = new Set<number>();
  const choiceTotals = new Set<number>();

  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const match = /^(\d+)(?: × (\d+))? = □ tens$/.exec(q.display ?? '');
      if (!match) throw new Error(`Missing or unclear tens equation: ${q.display}`);
      const first = Number(match[1]);
      let total = first;
      if (match[2] !== undefined) {
        const second = Number(match[2]);
        expect([2, 3, 4, 5, 10].includes(first) || [2, 3, 4, 5, 10].includes(second)).toBe(true);
        expect(Math.max(first, second)).toBeLessThanOrEqual(10);
        total = first * second;
        productTotals.add(total);
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps?.[0].equation).toBe(`${first} × ${second} = ${total}`);
      } else if (q.choices) {
        choiceTotals.add(total);
      } else {
        entryTotals.add(total);
      }

      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(1000);
      expect(total % 10).toBe(0);
      const hundreds = Math.floor(total / 100);
      const tensDigit = Math.floor((total % 100) / 10);
      const expected = String(10 * hundreds + tensDigit);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe('tens');
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        expect(q.choices).toContain(String(tensDigit));
        expect(String(tensDigit)).not.toBe(expected);
      }
    }
  }
  for (const totals of [productTotals, entryTotals, choiceTotals]) {
    expect(totals.size).toBeGreaterThan(1);
  }
});

it('reproduces the givens and choice order for the same seed and index', () => {
  for (const seed of [0, 8, 41, 137]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
  }
});
