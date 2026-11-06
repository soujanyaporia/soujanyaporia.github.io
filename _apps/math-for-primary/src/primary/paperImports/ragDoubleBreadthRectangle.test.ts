import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragDoubleBreadthRectangle';

function solveVisibleGivens(context: string[]) {
  const text = context.join(' ');
  const distance = /distance around a rectangular .+? is (\d+) m\./.exec(text);
  if (!distance || !text.includes('Each long side is twice as long as a short side.')) {
    throw new Error('Both the perimeter and the relationship between the sides must be visible.');
  }
  const perimeter = Number(distance[1]);
  const solutions: { breadth: number; length: number }[] = [];
  // One short side and one long side together account for half the perimeter.
  for (let breadth = 1; breadth < perimeter / 2; breadth++) {
    const length = perimeter / 2 - breadth;
    if (length === breadth + breadth) solutions.push({ breadth, length });
  }
  expect(solutions).toHaveLength(1);
  const { breadth, length } = solutions[0];
  return { perimeter, length, area: length * breadth };
}

it('recovers both ordered answers from the visible rectangle across seeds and indices', () => {
  const perimeters = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const { perimeter, length, area } = solveVisibleGivens(q.context ?? []);
      expect(perimeter).toBeGreaterThanOrEqual(12);
      expect(perimeter).toBeLessThanOrEqual(60);
      expect(perimeter).not.toBe(54);
      perimeters.add(perimeter);
      expect(q.prompt).toMatch(/\(a\).*long side.*\(b\).*square metres/);
      expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Length (m)', secondLabel: '(b) Area (m²)' });
      const expected = [String(length), String(area)];
      expect(JSON.parse(q.answer)).toEqual(expected);
      const spec = q.structuredResponse!;
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[1], expected[0]]))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0]]))).toBe(false);
    }
  }
  expect(perimeters.size).toBeGreaterThan(1);
});

it('reproduces a question for the same seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(31, 5)).toEqual(makeRagQuestion(31, 5));
});
