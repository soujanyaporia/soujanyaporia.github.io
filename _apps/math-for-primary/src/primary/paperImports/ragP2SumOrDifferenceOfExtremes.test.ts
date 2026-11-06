import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2SumOrDifferenceOfExtremes';

it('solves each prompt using only the four displayed numbers and its wording', () => {
  const operations = new Set<string>();
  const lists = new Set<string>();
  const largestPositions = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const display = q.display ?? '';
      expect(display).toMatch(/^\d{3}(, \d{3}){3}$/);
      const values = display.split(', ').map(Number);
      expect(new Set(values).size).toBe(4);
      expect(values.every(value => value >= 100 && value <= 999)).toBe(true);
      const sorted = [...values].sort((a, b) => a - b);
      const least = sorted[0];
      const greatest = sorted[3];
      const asksForSum = /add the smallest number to the largest/i.test(q.prompt);
      const asksForGap = /how much larger is the largest number than the smallest/i.test(q.prompt);
      expect(Number(asksForSum) + Number(asksForGap)).toBe(1);
      const expected = asksForSum ? greatest + least : greatest - least;
      expect(expected).toBeGreaterThan(0);
      expect(expected).toBeLessThan(1000);
      expect(q.answer).toBe(String(expected));
      expect(q.choices).toBeUndefined();
      expect(q.order).toBeUndefined();
      expect(q.unit).toBeUndefined();
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations).toContain(sorted.join(' < '));
      expect(equations).toContain(`${greatest} ${asksForSum ? '+' : '−'} ${least} = ${expected}`);
      operations.add(asksForSum ? 'sum' : 'difference');
      lists.add(sorted.join(','));
      largestPositions.add(values.indexOf(greatest));
    }
  }
  expect(operations.size).toBe(2);
  expect(lists.size).toBeGreaterThan(40);
  expect(largestPositions.size).toBe(4);
});

it('reproduces the same question for the same seed and index', () => {
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
  expect(makeRagQuestion(23, 7)).toEqual(makeRagQuestion(23, 7));
});
