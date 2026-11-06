import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragNumeralsFromDigitClues';

const seeds = Array.from({ length: 24 }, (_, i) => i * 31 - 260);
const questions = seeds.flatMap(seed => [0, 1, 2].map(index => makeRagQuestion(seed, index)));

function examples(prompt: string) {
  const selected = questions.filter(q => q.prompt === prompt);
  expect(selected).toHaveLength(seeds.length);
  expect(new Set(selected.map(q => q.context?.join(' '))).size).toBeGreaterThan(1);
  return selected;
}

function value(q: Question, pattern: RegExp): number {
  const match = pattern.exec((q.context ?? []).join('\n'));
  if (!match) throw new Error(`Missing visible clue for ${pattern}`);
  return Number(match[1]);
}

function fourChoices(q: Question, format: RegExp): string[] {
  const choices = q.choices ?? [];
  expect(choices).toHaveLength(4);
  expect(new Set(choices).size).toBe(4);
  for (const choice of choices) expect(choice).toMatch(format);
  return choices;
}

it('finds a unique third digit even when several four-digit numbers fit', () => {
  for (const q of examples('Which digit is third from the left?')) {
    const total = value(q, /The four digits of a number add to (\d+)\./);
    const front = value(q, /thousands and hundreds digits add to (\d+)\./);
    const difference = value(q, /difference between its tens digit and its ones digit is (\d+)\./);
    expect(difference).toBe(0);
    const thirds = new Set<string>();
    let matches = 0;
    for (let n = 1000; n <= 9999; n++) {
      const [a, b, c, d] = String(n).split('').map(Number);
      if (a + b === front && a + b + c + d === total && Math.abs(c - d) === difference) {
        thirds.add(String(c));
        matches++;
      }
    }
    expect(matches).toBeGreaterThan(1);
    expect([...thirds]).toEqual([q.answer]);
    expect(fourChoices(q, /^\d$/).filter(option => thirds.has(option))).toEqual([q.answer]);
  }
});

it('finds exactly one complete numeral from the end digits, sum and difference', () => {
  for (const q of examples('Write the four-digit number.')) {
    const first = value(q, /The first digit is (\d+)\./);
    const sum = value(q, /Adding the thousands digit and the tens digit gives (\d+)\./);
    const gap = value(q, /hundreds digit is (\d+) less than the tens digit\./);
    expect(q.context).toContain('The last digit is the largest possible digit.');
    expect(q.choices).toBeUndefined();
    const matches: string[] = [];
    for (let n = 1000; n <= 9999; n++) {
      const [a, b, c, d] = String(n).split('').map(Number);
      if (a === first && d === 9 && a + c === sum && b + gap === c) matches.push(String(n));
    }
    expect(matches).toEqual([q.answer]);
  }
});

it('uses the displayed choices to resolve the odd-number clues', () => {
  for (const q of examples('Which of these numbers fits every clue?')) {
    const tens = value(q, /It has (\d+) in the tens place\./);
    const gap = value(q, /Subtract (\d+) from its ones digit to get its hundreds digit\./);
    expect(q.context).toContain('Look for a three-digit odd number.');
    expect(q.context).toContain('Its ones digit is larger than its tens digit.');
    const possible = new Set<string>();
    for (let n = 101; n <= 999; n += 2) {
      const [a, b, c] = String(n).split('').map(Number);
      if (b === tens && c > b && c - a === gap) possible.add(String(n));
    }
    expect(possible.size).toBeGreaterThan(1);
    const choices = fourChoices(q, /^[1-9]\d{2}$/);
    expect(choices.filter(option => possible.has(option))).toEqual([q.answer]);
  }
});

it('replays the same question and uses all three response tasks over consecutive indices', () => {
  for (const seed of seeds) {
    const prompts = new Set<string>();
    for (const index of [0, 1, 2]) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
      prompts.add(q.prompt);
    }
    expect(prompts.size).toBe(3);
  }
});
