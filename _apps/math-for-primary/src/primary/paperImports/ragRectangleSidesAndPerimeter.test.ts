import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragRectangleSidesAndPerimeter';

it('solves both parts from the tape length and card width shown to the pupil', () => {
  const breadths = new Set<number>();
  const perimeters = new Set<number>();
  for (let seed = -8; seed <= 32; seed++) {
    for (const index of [0, 1, 5]) {
      const question = makeRagQuestion(seed, index);
      const text = question.context?.join(' ') ?? '';
      const tape = /(\d+) cm strip of tape goes once around the edge of a rectangular card/.exec(text);
      const width = /card is (\d+) cm wide/.exec(text);
      if (!tape || !width) throw new Error('The perimeter and width must both be visible.');
      const perimeter = Number(tape[1]);
      const breadth = Number(width[1]);
      // Removing the two short edges leaves two equal long edges.
      const length = (perimeter - breadth - breadth) / 2;
      const area = length * breadth;
      perimeters.add(perimeter);
      breadths.add(breadth);
      expect(Number.isInteger(length)).toBe(true);
      expect(breadth).toBeGreaterThanOrEqual(3);
      expect(breadth).toBeLessThanOrEqual(8);
      expect(length).toBeGreaterThanOrEqual(17);
      expect(length).toBeLessThanOrEqual(38);
      expect(question.structuredResponse).toEqual({
        kind: 'number-pair', firstLabel: '(a) Length (cm)', secondLabel: '(b) Area (cm²)',
      });
      const response = question.structuredResponse;
      if (!response) throw new Error('Both answers need entry fields.');
      const grade = (entries: number[]) => structuredResponseCorrect(response, question.answer, JSON.stringify(entries.map(String)));
      expect(grade([length, area])).toBe(true);
      expect(grade([area, length])).toBe(false);
      expect(grade([length])).toBe(false);
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${perimeter} ÷ 2 = ${length + breadth} cm`,
        `${length + breadth} − ${breadth} = ${length} cm`,
        `${length} × ${breadth} = ${area} cm²`,
      ]);
    }
  }
  expect(perimeters.size).toBeGreaterThan(5);
  expect(breadths.size).toBeGreaterThan(2);
});

it('reproduces a question for the same seed and index and varies a session’s givens', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(17, index);
    expect(question).toEqual(makeRagQuestion(17, index));
    contexts.add(JSON.stringify(question.context));
  }
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(contexts.size).toBeGreaterThan(1);
});
