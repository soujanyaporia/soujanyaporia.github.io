import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragWholeNumberDivision';

it('grades both entries against complete groups counted from the displayed division', () => {
  for (let seed = 0; seed < 40; seed++) {
    for (const index of [0, 1, 7]) {
      const question = makeRagQuestion(seed, index);
      const match = /^(\d{3}) ÷ ([2-9])$/.exec(question.display ?? '');
      if (!match) throw new Error(`Expected a three-digit dividend and one-digit divisor in ${question.display}`);
      const total = Number(match[1]);
      const groupSize = Number(match[2]);
      let fullGroups = 0;
      let left = total;
      while (left >= groupSize) {
        left -= groupSize;
        fullGroups++;
      }

      expect(left).toBeGreaterThan(0);
      expect(question.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Quotient', secondLabel: 'Remainder' });
      const pair = (q: number, r: number) => JSON.stringify([String(q), String(r)]);
      expect(question.answer).toBe(pair(fullGroups, left));
      expect(correctAnswer(question, pair(fullGroups, left))).toBe(true);
      expect(correctAnswer(question, pair(left, fullGroups))).toBe(false);
      expect(correctAnswer(question, pair(fullGroups + 1, left))).toBe(false);
      expect(correctAnswer(question, pair(fullGroups, left - 1))).toBe(false);
      expect(correctAnswer(question, JSON.stringify([String(fullGroups)]))).toBe(false);
    }
  }
});

it('reproduces each question and varies the visible division across indices', () => {
  const displays = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const question = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(question);
    displays.add(question.display ?? '');
  }
  expect(displays.size).toBeGreaterThan(1);
});
