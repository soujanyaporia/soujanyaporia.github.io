import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragNumeralOrdering';

function readFour(text: string): number[] {
  expect(text).toMatch(/^\d+(?:,\s*\d+){3}$/);
  const values = text.split(',').map(Number);
  expect(new Set(values).size).toBe(4);
  expect(values.every(v => v >= 1 && v <= 1000)).toBe(true);
  return values;
}

const questions = Array.from({ length: 28 }, (_, s) =>
  Array.from({ length: 7 }, (_, i) => makeRagQuestion(s - 7, i))
).flat();

it('uses every displayed numeral once, with the greatest first', () => {
  const items = questions.filter(q => q.order !== undefined);
  expect(items.length).toBeGreaterThan(20);
  for (const q of items) {
    expect(q.prompt).toMatch(/largest first/i);
    const numbers = readFour(q.order!.join(','));
    expect(numbers.every(n => n >= 100 && n <= 999)).toBe(true);
    expect(new Set(numbers.map(n => Math.floor(n / 100))).size).toBeLessThan(4);
    const remaining = [...numbers];
    const solution: number[] = [];
    while (remaining.length) {
      const largest = Math.max(...remaining);
      solution.push(largest);
      remaining.splice(remaining.indexOf(largest), 1);
    }
    const expected = solution.join(',');
    expect(q.answer).toBe(expected);
    expect(correctAnswer(q, expected)).toBe(true);
    expect(correctAnswer(q, [...solution].reverse().join(','))).toBe(false);
    expect(correctAnswer(q, solution.slice(0, 3).join(','))).toBe(false);
    expect(numbers).not.toEqual(solution);
  }
});

it('finds exactly one listed number that completes both strict comparisons', () => {
  const items = questions.filter(q => q.display?.includes('□'));
  expect(items.length).toBeGreaterThan(10);
  for (const q of items) {
    const line = /^(\d+) < (\d+) < □$/.exec(q.display!);
    const list = /^Choose from (.+)\.$/.exec(q.context?.[0] ?? '');
    expect(line).toBeTruthy();
    expect(list).toBeTruthy();
    const lower = Number(line![1]);
    const middle = Number(line![2]);
    const options = readFour(list![1]);
    expect(lower).toBeGreaterThanOrEqual(1);
    expect(lower).toBeLessThan(middle);
    const valid = options.filter(n => lower < middle && middle < n);
    expect(valid).toHaveLength(1);
    expect(q.answer).toBe(String(valid[0]));
    expect(q.choices).toBeUndefined();
    for (const n of [...options, middle, lower]) {
      expect(correctAnswer(q, String(n))).toBe(valid.includes(n));
    }
  }
});

it('recognises the one ascending row by checking all three adjacent pairs', () => {
  const items = questions.filter(q => q.choices !== undefined);
  expect(items.length).toBeGreaterThan(10);
  for (const q of items) {
    expect(q.prompt).toMatch(/smallest.*largest/i);
    const choices = q.choices!;
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    const rows = choices.map(readFour);
    for (const row of rows) expect(new Set(row)).toEqual(new Set(rows[0]));
    const valid = choices.filter((_, i) => {
      const [a, b, c, d] = rows[i];
      return a < b && b < c && c < d;
    });
    expect(valid).toHaveLength(1);
    expect(q.answer).toBe(valid[0]);
    for (const row of choices) expect(correctAnswer(q, row)).toBe(row === valid[0]);
  }
});

it('reproduces each question and varies visible givens in every response form', () => {
  const distinct = { order: new Set<string>(), entry: new Set<string>(), choice: new Set<string>() };
  for (const seed of [-3, 0, 8, 17, 42]) {
    for (let index = 0; index < 14; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      if (q.order) distinct.order.add(q.order.join(','));
      else if (q.choices) distinct.choice.add(q.choices.join('|'));
      else distinct.entry.add(`${q.display} ${q.context?.join(' ')}`);
    }
  }
  for (const examples of Object.values(distinct)) expect(examples.size).toBeGreaterThan(3);
});
