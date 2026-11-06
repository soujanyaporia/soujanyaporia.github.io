import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragSquareOverlapAngles';

// Solve from the displayed context and the stated square properties, without
// reading q.answer or generator parameters.
function solveVisible(q: ReturnType<typeof makeRagQuestion>): number {
  const text = q.context?.join(' ') ?? '';
  const match = /Angle WCB is (\d+)°/.exec(text);
  if (!match || !text.includes('Two squares ABCD and CWXY share side WC')) throw new Error('Missing visible givens');
  const given = Number(match[1]);
  return (90 - given) + (90 - given);
}

describe('square overlap angle sum', () => {
  it('matches an independent solver across varied seeds', () => {
    for (const seed of [1, 7, 23, 91, 2026]) {
      const q = makeRagQuestion(seed);
      expect(Number(q.answer)).toBe(solveVisible(q));
      expect(q.unit).toBe('degrees');
      expect(q.workedSteps?.length).toBe(3);
    }
  });
});
