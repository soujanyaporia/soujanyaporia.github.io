import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragMinutesToHoursAndMinutes';

it('grades both labelled fields against an independent count of full hours in the prompt', () => {
  const totals = new Set<number>();
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const given = /\b(\d+) minutes\b/.exec(question.prompt);
      if (!given) throw new Error('The pupil needs a duration in minutes.');
      const total = Number(given[1]);
      totals.add(total);

      let hours = 0;
      let remaining = total;
      while (remaining >= 60) {
        hours++;
        remaining -= 60;
      }
      expect(hours).toBeGreaterThanOrEqual(2);
      expect(hours).toBeLessThanOrEqual(5);
      expect(remaining).toBeGreaterThan(0);
      expect(question.structuredResponse).toEqual({
        kind: 'number-pair', firstLabel: 'Hours', secondLabel: 'Minutes',
      });
      const expected = JSON.stringify([String(hours), String(remaining)]);
      expect(question.answer).toBe(expected);
      expect(correctAnswer(question, expected)).toBe(true);
      const ungrouped = JSON.stringify([String(hours - 1), String(remaining + 60)]);
      expect(correctAnswer(question, ungrouped)).toBe(false);
      expect(correctAnswer(question, JSON.stringify([String(hours), '']))).toBe(false);
    }
  }
  expect(totals.size).toBeGreaterThan(8);
});

it('repeats the same question for the same seed and index', () => {
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
  expect(makeRagQuestion(18, 3)).toEqual(makeRagQuestion(18, 3));
});
