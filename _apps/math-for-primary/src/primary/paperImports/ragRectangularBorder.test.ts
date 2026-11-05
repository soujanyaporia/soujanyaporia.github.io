import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragRectangularBorder';

it('solves both parts from the visible measurements using strips and boundary lengths', () => {
  const widths = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (const index of [0, 1, 7]) {
      const question = makeRagQuestion(seed, index);
      const givens = question.context?.join(' ') ?? '';
      const outer = /garden measures (\d+) m by (\d+) m/.exec(givens);
      const path = /It is (\d+) m wide all the way round/.exec(givens);
      if (!outer || !path) throw new Error('Missing garden dimensions or path width');
      expect(givens).toContain('inside all four edges');
      const length = Number(outer[1]);
      const width = Number(outer[2]);
      const strip = Number(path[1]);
      widths.add(strip);
      expect(strip).toBeGreaterThan(0);
      expect(Math.min(length, width)).toBeGreaterThan(2 * strip);

      // The top and bottom strips include the corners. The side strips stop short of them.
      const pathArea = 2 * length * strip + 2 * (width - 2 * strip) * strip;
      // Each of the four outer sides loses one path width at each end.
      const lawnPerimeter = 2 * (length + width) - 8 * strip;
      const response = question.structuredResponse;
      expect(response).toEqual({ kind: 'number-pair', firstLabel: '(a) Path area (m²)', secondLabel: '(b) Lawn perimeter (m)' });
      if (!response) throw new Error('Missing response fields');
      const pair = [String(pathArea), String(lawnPerimeter)];
      expect(JSON.parse(question.answer)).toEqual(pair);
      expect(structuredResponseCorrect(response, question.answer, JSON.stringify(pair))).toBe(true);
      const withOuterPerimeter = [pair[0], String(2 * (length + width))];
      expect(structuredResponseCorrect(response, question.answer, JSON.stringify(withOuterPerimeter))).toBe(false);
    }
  }
  expect(widths.size).toBeGreaterThan(1);
});

it('reproduces a question for the same seed and varies the visible givens across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const question = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(question);
    contexts.add(JSON.stringify(question.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
