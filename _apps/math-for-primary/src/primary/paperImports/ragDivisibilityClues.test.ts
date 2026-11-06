import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragDivisibilityClues';

function read(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible clue in ${text}`);
  return match.slice(1).map(Number);
}

// Try every permitted number, independently of how the generator picks a total.
function solveVisible(q: Question) {
  const text = [q.prompt, ...(q.context ?? [])].join(' ');
  if (q.choices) {
    const [first, second] = read(text, /full groups of (\d+) and also full groups of (\d+)/);
    const values = q.choices.map(Number);
    expect(values).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
    expect(values.every(n => Number.isInteger(n) && n > 0)).toBe(true);
    expect(values.filter(n => n % first === 0)).toHaveLength(2);
    expect(values.filter(n => n % second === 0)).toHaveLength(2);
    return { kind: 'choice', matches: values.filter(n => n % first === 0 && n % second === 0) };
  }

  if (text.includes('two-digit')) {
    const [limit] = read(text, /two-digit number less than (\d+)/);
    const tables = read(text, /in the (\d+), (\d+) and (\d+) times tables/);
    expect(new Set(tables).size).toBe(3);
    expect(tables.every(n => [2, 3, 4, 5, 10].includes(n))).toBe(true);
    const matches: number[] = [];
    for (let n = 10; n <= 99; n++) {
      if (n < limit && tables.every(table => n % table === 0)) matches.push(n);
    }
    return { kind: 'tables', matches };
  }

  if (q.prompt.includes('beads')) {
    const [low, high] = read(text, /more than (\d+) beads and fewer than (\d+) beads/);
    const [children] = read(text, /shared equally among (\d+) children with none left over/);
    expect(q.unit).toBe('beads');
    const matches: number[] = [];
    for (let n = low + 1; n < high; n++) if (n % children === 0) matches.push(n);
    return { kind: 'share', matches };
  }

  const [limit] = read(text, /fewer than (\d+) in all/);
  const [fullSize] = read(text, /piles of (\d+) without leaving any buttons out/);
  const [otherSize, left] = read(text, /piles of (\d+) instead, she has (\d+) left over/);
  expect(q.unit).toBe('buttons');
  expect(left).toBeGreaterThan(0);
  expect(left).toBeLessThan(otherSize);
  const matches: number[] = [];
  for (let n = 1; n < limit; n++) {
    if (n % fullSize === 0 && n % otherSize === left) matches.push(n);
  }
  return { kind: 'leftover', matches };
}

it('gives exactly one answer to the visible clues in all four forms', () => {
  for (let seed = -12; seed <= 48; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { kind, matches } = solveVisible(q);
      forms.add(kind);
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(String(matches[0]));
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      expect(q.picture).toBeUndefined();
    }
    expect([...forms].sort()).toEqual(['choice', 'leftover', 'share', 'tables']);
  }
});

it('reproduces a question for the same seed and index and varies the visible givens', () => {
  const questions = new Set<string>();
  for (let seed = 0; seed < 20; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      questions.add(JSON.stringify([q.prompt, q.context, q.choices]));
    }
  }
  expect(questions.size).toBeGreaterThan(16);
});
