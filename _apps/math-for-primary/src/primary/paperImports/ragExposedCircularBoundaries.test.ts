import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragExposedCircularBoundaries';

function solveFromVisibleQuestion(prompt: string, context: string[]): number {
  const text = `${context.join(' ')} ${prompt}`;
  const sideMatch = /square has side length (\d+) cm/i.exec(text);
  const diameterMatch = /semicircle with diameter (\d+) cm/i.exec(text);
  if (!sideMatch) throw new Error('Missing visible square-side given');
  if (!diameterMatch) throw new Error('Missing visible semicircle-diameter given');
  const side = Number(sideMatch[1]);
  const diameter = Number(diameterMatch[1]);
  return 3 * side + (side - diameter) + (22 / 7) * diameter / 2;
}

describe('exposed circular boundary cutout', () => {
  it('has visible givens that independently determine the perimeter across varied seeds', () => {
    for (const [seed, index] of [[1, 0], [9, 2], [21, 4], [38, 7], [101, 3]] as const) {
      const question = makeRagQuestion(seed, index);
      const independentlySolved = solveFromVisibleQuestion(question.prompt, question.context ?? []);
      expect(Number(question.answer)).toBeCloseTo(independentlySolved, 8);
      expect(question.unit).toBe('cm');
    }
  });
});
