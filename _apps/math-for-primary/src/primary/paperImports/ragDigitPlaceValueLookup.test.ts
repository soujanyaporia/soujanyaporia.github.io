import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragDigitPlaceValueLookup';

const leftToRight = ['thousands', 'hundreds', 'tens', 'ones'];

function locate(numeral: string, target: string): number {
  expect(numeral).toMatch(/^[1-9]\d{3}$/);
  const column = numeral.indexOf(target);
  expect(column).toBeGreaterThanOrEqual(0);
  expect(numeral.lastIndexOf(target)).toBe(column);
  return column;
}

function solve({ prompt, choices = [] }: Pick<Question, 'prompt' | 'choices'>) {
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);

  const sum = /^Add (\d+) and (\d+)\. What is the digit (\d) worth in the total\?$/.exec(prompt);
  if (sum) {
    const first = Number(sum[1]);
    const second = Number(sum[2]);
    for (const operand of [first, second]) {
      expect(operand).toBeGreaterThanOrEqual(1000);
      expect(operand).toBeLessThan(10000);
    }
    expect(first % 10 + second % 10).toBeGreaterThanOrEqual(10);
    const total = String(first + second);
    const digit = sum[3];
    const column = locate(total, digit);
    const answer = digit + '0'.repeat(total.length - column - 1);
    expect([...choices].sort()).toEqual([digit, digit + '0', digit + '00', digit + '000'].sort());
    return { mode: 'sum', answer, column };
  }

  const named = /^In (\d+), which place holds the digit (\d)\?$/.exec(prompt);
  if (named) {
    const column = locate(named[1], named[2]);
    expect([...choices].sort()).toEqual([...leftToRight].sort());
    return { mode: 'name', answer: leftToRight[column], column };
  }

  const highest = /^In which number is the digit (\d) worth the most\?$/.exec(prompt);
  if (highest) {
    const columns = choices.map(n => locate(n, highest[1]));
    expect(new Set(columns).size).toBe(4);
    const column = Math.min(...columns);
    const answer = choices[columns.indexOf(column)];
    expect(Number(answer)).toBeLessThan(Math.max(...choices.map(Number)));
    return { mode: 'highest', answer, column };
  }

  const match = /^Which number has (\d) as its (ones|tens|hundreds|thousands) digit\?$/.exec(prompt);
  if (!match) throw new Error(`Cannot solve prompt: ${prompt}`);
  const column = leftToRight.indexOf(match[2]);
  choices.forEach(n => locate(n, match[1]));
  const matches = choices.filter(n => n[column] === match[1]);
  expect(matches).toHaveLength(1);
  return { mode: 'match', answer: matches[0], column };
}

it('solves all four tasks from the displayed prompt and options across seeds', () => {
  const sumColumns = new Set<number>();
  for (let seed = -24; seed < 72; seed++) {
    const modes = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solve({ prompt: q.prompt, choices: q.choices });
      expect(q.answer).toBe(expected.answer);
      expect(q.choices).toContain(expected.answer);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      modes.add(expected.mode);
      if (expected.mode === 'sum') sumColumns.add(expected.column);
    }
    expect([...modes].sort()).toEqual(['highest', 'match', 'name', 'sum']);
  }
  expect(sumColumns.size).toBe(4);
});

it('reproduces the same question for the same seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  for (const index of [1, 4, 9]) {
    expect(makeRagQuestion(17, index)).toEqual(makeRagQuestion(17, index));
    expect(makeRagQuestion(17, index).key).not.toBe(makeRagQuestion(17).key);
  }
});
