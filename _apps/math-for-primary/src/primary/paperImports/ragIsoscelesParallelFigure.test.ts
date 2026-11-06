import {describe, expect, it} from 'vitest';
import {makeRagQuestion} from './ragIsoscelesParallelFigure';

function solveFromVisibleGivens(question: ReturnType<typeof makeRagQuestion>): number {
  const [figure, angles] = question.context ?? [];
  if (!figure || !angles) throw new Error('Expected the figure relationships and angle givens in the question.');
  if (!/ABCD is a trapezium with AB parallel to DC/.test(figure) || !/BD = BC/.test(figure)) {
    throw new Error('The visible figure description is missing a required relationship.');
  }
  const top = /Angle DAB is (\d+)°/.exec(angles);
  const split = /Angle ADB is (\d+)°/.exec(angles);
  if (!top || !split || question.prompt !== 'Find angle BCD.') throw new Error('Could not read the visible angle givens and target.');
  const wholeAtD = 180 - Number(top[1]);
  const baseAtD = wholeAtD - Number(split[1]);
  return baseAtD;
}

describe('isosceles triangle across parallel-sided figures', () => {
  it('matches an independent solve from the visible givens across varied seeds', () => {
    for (const seed of [1, 7, 23, 101, 2026]) {
      const question = makeRagQuestion(seed);
      expect(Number(question.answer)).toBe(solveFromVisibleGivens(question));
      expect(Number(question.answer)).toBeGreaterThan(0);
      expect(Number(question.answer)).toBeLessThan(90);
    }
  });
});
