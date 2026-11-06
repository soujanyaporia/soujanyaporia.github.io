import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2SemicirclesPerWholeCircle';

it('counts one top half and one bottom half for every circle named in the prompt', () => {
  const counts = new Set<number>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const picture = question.picture;
      expect(picture?.type).toBe('pattern');
      if (picture?.type !== 'pattern') throw new Error('Missing whole circles');
      const given = /\b(\d+) whole circles\b/.exec(question.prompt);
      if (!given) throw new Error('The prompt must give the number of whole circles.');
      const circles = Number(given[1]);
      expect(circles).toBeGreaterThanOrEqual(3);
      expect(circles).toBeLessThanOrEqual(10);
      expect(picture.items).toEqual(Array<string>(circles).fill('◯'));
      counts.add(circles);

      const topHalves = circles;
      const bottomHalves = circles;
      const expected = String(topHalves + bottomHalves);
      expect(question.unit).toBe('semicircles');
      expect(question.answer).toBe(expected);
      expect(correctAnswer(question, expected)).toBe(true);
      expect(correctAnswer(question, String(circles))).toBe(false);
      expect(question.workedSteps?.at(-1)?.equation).toBe(`${circles} × 2 = ${expected}`);
    }
  }
  expect(counts.size).toBeGreaterThan(1);
});

it('reproduces a question and varies the visible count across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const prompts = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const question = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(question);
    prompts.add(question.prompt);
  }
  expect(prompts.size).toBeGreaterThan(1);
});
