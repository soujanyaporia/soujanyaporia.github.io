import {describe, expect, it} from 'vitest';
import {makeRagQuestion} from './ragEqualGroupSizeTransfer';

function solveFromVisibleGivens(context: string[], prompt: string): [number, number] {
  expect(prompt).toMatch(/How many bicycles.*altogether\?/);
  const match = context.join(' ').match(/draws (\d+) cars\. She draws the same number of bicycles\./);
  if (!match) throw new Error('Could not read the stated car count and equality from the question.');
  const cars = Number(match[1]);
  return [cars, cars + cars];
}

describe('equal group size transfer', () => {
  it('answers both linked parts from the visible givens for varied seeds', () => {
    for (const [seed, index] of [[1, 0], [19, 2], [2026, 5], [87, 11], [5, 4]]) {
      const question = makeRagQuestion(seed, index);
      const expected = solveFromVisibleGivens(question.context ?? [], question.prompt);
      expect(JSON.parse(question.answer).map(Number)).toEqual(expected);
      expect(expected[0]).not.toBe(3);
      expect(expected[1]).toBeLessThanOrEqual(20);
    }
  });
});
