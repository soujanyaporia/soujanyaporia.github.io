import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragConsecutiveNumbers';

const wholeNumbers = Array.from({ length: 101 }, (_, n) => n);

function solvePrompt(prompt: string) {
  const before = /just before (\d+)\?/.exec(prompt);
  if (before) {
    const given = Number(before[1]);
    expect(given).toBeGreaterThanOrEqual(1);
    expect(given).toBeLessThanOrEqual(100);
    return { kind: 'before', solutions: wholeNumbers.filter(n => n + 1 === given) };
  }
  const between = /from (\d+) to (\d+)\..*in between\?/.exec(prompt);
  if (!between) throw new Error(`Cannot find the counting task in ${prompt}`);
  const lower = Number(between[1]);
  const upper = Number(between[2]);
  expect(lower).toBeGreaterThanOrEqual(0);
  expect(upper).toBeLessThanOrEqual(100);
  expect(upper - lower).toBe(2);
  expect([[5, 7], [29, 31], [50, 52]]).not.toContainEqual([lower, upper]);
  return { kind: 'between', solutions: wholeNumbers.filter(n => lower < n && n < upper) };
}

test('each prompt identifies exactly one whole number in either response form', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (const index of [0, 1, 2]) {
      const q = makeRagQuestion(seed, index);
      const { kind, solutions } = solvePrompt(q.prompt);
      expect(solutions).toHaveLength(1);
      const expected = String(solutions[0]);
      expect(q.answer).toBe(expected);
      forms.add(`${kind}-${q.choices ? 'choice' : 'entry'}`);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
        for (const choice of q.choices) {
          expect(wholeNumbers.map(String)).toContain(choice);
        }
      }
    }
  }
  expect(forms).toEqual(new Set(['before-entry', 'before-choice', 'between-entry', 'between-choice']));
});

test('a seed and index reproduce the question, including the order of its choices', () => {
  for (const seed of [0, 17, 408]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
  }
});
