import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragTriangleExteriorAngleChain';

describe('triangle exterior-angle chain', () => {
  it('solves the visible angle givens independently for varied seeds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const question = makeRagQuestion(seed * 7919, seed % 7);
      const givens = /angle CAD is (\d+)°\. The exterior angle CDE is (\d+)°/.exec(question.prompt);
      expect(givens, question.prompt).not.toBeNull();
      const angleAtA = Number(givens![1]);
      const exteriorAtD = Number(givens![2]);
      const insideAtC = exteriorAtD - angleAtA;
      const independentlySolved = 180 - insideAtC;
      expect(Number(question.answer)).toBe(independentlySolved);
      expect(question.unit).toBe('°');
    }
  });
});
