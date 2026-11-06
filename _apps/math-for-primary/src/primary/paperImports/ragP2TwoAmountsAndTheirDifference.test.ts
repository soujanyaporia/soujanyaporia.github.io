import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2TwoAmountsAndTheirDifference';

it('solves the printed comparison and checks each requested entry across seeds and indices', () => {
  const purses = new Set<string>();
  const jars = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      if (story.includes('purse')) {
        const match = /^There is \$(\d+) in Asha's purse\. That is \$(\d+) less than the amount in Ben's purse\.$/.exec(story);
        if (!match) throw new Error(`Missing purse comparison: ${story}`);
        const asha = Number(match[1]), gap = Number(match[2]);
        // Both purses contain an Asha-sized share; only Ben has the extra dollars.
        const together = 2 * asha + gap;
        expect(gap).toBeGreaterThan(0);
        expect(together).toBeLessThanOrEqual(100);
        expect(q.prompt).toContain('together');
        expect(q.unit).toBe('dollars');
        expect(q.structuredResponse).toBeUndefined();
        expect(correctAnswer(q, String(together))).toBe(true);
        expect(correctAnswer(q, String(asha + gap))).toBe(false);
        expect(correctAnswer(q, String(2 * asha - gap))).toBe(false);
        purses.add(story);
      } else {
        const match = /^On Saturday, Ravi put (\d+)¢ in his jar\. On Sunday, he put in (\d+)¢ more than he did on Saturday\.$/.exec(story);
        if (!match) throw new Error(`Missing daily comparison: ${story}`);
        const first = Number(match[1]), gap = Number(match[2]);
        const second = first + gap, cents = 2 * first + gap;
        expect(first).toBeGreaterThan(0);
        expect(second).toBeGreaterThan(first);
        expect(second).toBeLessThan(100);
        expect(cents).toBeGreaterThan(100);
        expect(cents).toBeLessThan(200);
        const inDollars = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
        const expected = JSON.stringify([String(second), inDollars]);
        expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [{ label: '(a) Sunday (cents)' }, { label: '(b) Both days (dollars)', decimal: true }] });
        expect(q.answer).toBe(expected);
        expect(correctAnswer(q, expected)).toBe(true);
        for (const wrong of [[String(gap), inDollars], [String(second), String(cents)], [inDollars, String(second)], [inDollars]]) {
          expect(correctAnswer(q, JSON.stringify(wrong))).toBe(false);
        }
        jars.add(story);
      }
    }
  }
  expect(purses.size).toBeGreaterThan(4);
  expect(jars.size).toBeGreaterThan(4);
});

it('recreates the same question for the same seed and index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  const questions = Array.from({ length: 8 }, (_, i) => makeRagQuestion(27, i));
  expect(questions.map(q => q.key)).toEqual([...new Set(questions.map(q => q.key))]);
  expect(questions).toEqual(Array.from({ length: 8 }, (_, i) => makeRagQuestion(27, i)));
});
