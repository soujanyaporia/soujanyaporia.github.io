import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragNumberNameToDigits';

const wholeNames: Record<string, number> = {
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};
const units = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

function readVisibleName(name: string): number {
  const [first, last, ...extra] = name.split('-');
  const base = wholeNames[first];
  if (!Number.isInteger(base) || extra.length) throw new Error(`Unknown number name: ${name}`);
  if (last === undefined) return base;
  const ones = units.indexOf(last) + 1;
  if (base < 20 || ones === 0) throw new Error(`Invalid compound name: ${name}`);
  return base + ones;
}

it('solves the displayed name and checks the digit response across seeds and indices', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 120; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const name = q.display ?? '';
      const expected = readVisibleName(name);
      expect(expected).toBeGreaterThanOrEqual(10);
      expect(expected).toBeLessThanOrEqual(99);
      expect([15, 27, 38, 40, 76, 98]).not.toContain(expected);
      expect(q.answer).toBe(String(expected));
      expect(correctAnswer(q, String(expected))).toBe(true);
      expect(correctAnswer(q, name)).toBe(false);
      expect(correctAnswer(q, String(expected + 1))).toBe(false);
      const ones = expected % 10;
      expect(q.workedSteps?.[0].equation).toBe(`${expected - ones} + ${ones} = ${expected}`);
      forms.add(ones === 0 ? 'whole ten' : expected < 20 ? 'teen' : 'compound');
    }
  }
  expect(forms).toEqual(new Set(['whole ten', 'teen', 'compound']));
});

it('reproduces a question for the same inputs and varies the visible name with index', () => {
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
  expect(makeRagQuestion(23, 7)).toEqual(makeRagQuestion(23, 7));
  const names = Array.from({ length: 16 }, (_, index) => makeRagQuestion(23, index).display);
  expect(new Set(names).size).toBeGreaterThan(1);
});
