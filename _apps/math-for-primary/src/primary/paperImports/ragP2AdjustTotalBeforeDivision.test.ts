import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2AdjustTotalBeforeDivision';

function solveFromVisibleQuestion(prompt: string): number {
  const match = /Mina has (\d+) red beads and (\d+) blue beads\. She shares all the beads equally among (\d+) children\./.exec(prompt);
  if (!match) throw new Error(`Could not read visible givens: ${prompt}`);
  const red = Number(match[1]);
  const blue = Number(match[2]);
  const children = Number(match[3]);
  if (children <= 0 || (red + blue) % children !== 0) throw new Error('Visible amounts do not make an exact share');
  return (red + blue) / children;
}

describe('p2-adjust-total-before-division', () => {
  it('shows two amounts and an exact equal share across varied seeds', () => {
    for (const seed of [-12, 0, 1, 8, 29, 104]) {
      for (const index of [0, 1, 3]) {
        const question = makeRagQuestion(seed, index);
        expect(solveFromVisibleQuestion(question.prompt)).toBe(Number(question.answer));
        expect(question.unit).toBe('beads');
        expect(question.workedSteps).toHaveLength(2);
      }
    }
  });
});
