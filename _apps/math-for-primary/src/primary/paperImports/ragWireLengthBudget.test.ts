import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragWireLengthBudget';

describe('wire length budget', () => {
  it('computes the leftover from the visible rectangle and wire givens', () => {
    for (const [seed, index] of [[1, 0], [7, 2], [2024, 4], [91, 8]] as const) {
      const question = makeRagQuestion(seed, index);
      const values = [...question.prompt.matchAll(/(\d+) cm/g)].map(match => Number(match[1]));
      expect(values).toHaveLength(6);
      const [wire, leftWidth, leftHeight, rightWidth, rightHeight, shared] = values;
      const used = 2 * (leftWidth + leftHeight) + 2 * (rightWidth + rightHeight) - 2 * shared;
      expect(Number(question.answer)).toBe(wire - used);
      expect(question.unit).toBe('cm');
    }
  });
});
