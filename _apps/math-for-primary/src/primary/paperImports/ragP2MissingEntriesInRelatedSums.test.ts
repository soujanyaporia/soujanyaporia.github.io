import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP2MissingEntriesInRelatedSums';

function readNumbers(line: string | undefined, pattern: RegExp): number[] {
  const match = pattern.exec(line ?? '');
  if (!match) throw new Error(`Unexpected equation: ${line}`);
  return match.slice(1).map(Number);
}

function onlySolution(limit: number, fits: (n: number) => boolean): number {
  const matches = Array.from({ length: limit + 1 }, (_, i) => i).filter(fits);
  expect(matches).toHaveLength(1);
  return matches[0];
}

function solveVisible(q: Question): [string, number] {
  if (q.picture) {
    const table = q.picture;
    if (table.type !== 'nanyang-p4' || table.layout !== 'table') throw new Error('Expected a place-value table');
    expect(q.context?.join(' ')).toMatch(/same digit/i);
    expect(table.columns).toEqual(['Hundreds', 'Tens', 'Ones']);
    expect(table.rows.map(row => row.label)).toEqual(['First number', '+ Second number', '= Total']);
    const [top, bottom, total] = table.rows.map(row => row.values);
    expect(top[1]).toBeNull();
    expect(bottom[0]).toBeNull();
    expect([...top, ...bottom, ...total].filter(n => n === null)).toHaveLength(2);
    for (const row of [top, bottom, total]) {
      expect(row).toHaveLength(3);
      expect(row.every(n => n === null || (Number.isInteger(n) && n >= 0 && n <= 9))).toBe(true);
    }
    const fill = (row: (number | null)[], d: number) => row.reduce<number>((v, cell) => v * 10 + (cell ?? d), 0);
    const digit = onlySolution(9, d => fill(top, d) + fill(bottom, d) === fill(total, d));
    expect(digit).toBeGreaterThan(0);
    expect(top[2]! + bottom[2]!).toBeGreaterThanOrEqual(10);
    expect(digit + bottom[1]! + 1).toBeGreaterThanOrEqual(10);
    return ['column', digit];
  }

  if (q.display === '▲ + ▲ = ?') {
    const [, first, second, third] = q.context ?? [];
    const [sum] = readNumbers(first, /^★ \+ ★ \+ ★ = (\d+)$/);
    const [product] = readNumbers(second, /^● × ★ = (\d+)$/);
    const [difference] = readNumbers(third, /^▲ − ● = (\d+)$/);
    const star = onlySolution(sum, n => n + n + n === sum);
    const circle = onlySolution(product, n => n * star === product);
    expect([2, 3, 4, 5, 10]).toContain(star);
    const triangle = onlySolution(99, n => n - circle === difference);
    return ['shapes', triangle + triangle];
  }

  const [first, second, round] = readNumbers(q.display, /^(\d+) \+ (\d+) = (\d+) \+ □$/);
  expect(round % 100).toBe(0);
  expect(first - round).toBeGreaterThan(0);
  expect(first - round).toBeLessThan(10);
  expect(first + second).toBeLessThan(1000);
  return ['equal sums', onlySolution(999, n => round + n === first + second)];
}

it('solves each visible layout and grades one unitless numeric entry', () => {
  for (let seed = -12; seed <= 60; seed++) {
    const layouts = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const [layout, solution] = solveVisible(q);
      layouts.add(layout);
      expect(q.answer).toBe(String(solution));
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(correctAnswer(q, String(solution))).toBe(true);
      expect(correctAnswer(q, String(solution + 1))).toBe(false);
    }
    expect(layouts).toEqual(new Set(['equal sums', 'shapes', 'column']));
  }
});

it('replays the same question and varies the visible givens within every layout', () => {
  const samples = new Map<string, Set<string>>();
  for (let seed = 0; seed < 18; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const [layout] = solveVisible(q);
      const givens = samples.get(layout) ?? new Set<string>();
      givens.add(JSON.stringify([q.context, q.display, q.picture]));
      samples.set(layout, givens);
    }
  }
  expect(samples.size).toBe(3);
  for (const givens of samples.values()) expect(givens.size).toBeGreaterThan(5);
});
