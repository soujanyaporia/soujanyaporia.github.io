import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCompareCountsAndTotals';

function read(counts: Map<string, number>, label: string): number {
  const value = counts.get(label);
  if (value === undefined) throw new Error(`Missing row for ${label}`);
  return value;
}

function solve({ picture, prompt }: Pick<Question, 'picture' | 'prompt'>) {
  if (picture?.type === 'nanyang-p4' && picture.layout === 'table') {
    expect(picture.rows).toHaveLength(4);
    expect(picture.columns).toHaveLength(1);
    const counts = new Map<string, number>();
    for (const row of picture.rows) {
      expect(row.values).toHaveLength(1);
      const value = row.values[0];
      if (value === null || !Number.isInteger(value)) throw new Error('Expected a whole number in each row');
      counts.set(row.label, value);
    }
    expect(counts.size).toBe(4);
    const values = [...counts.values()];
    const height = /^How many centimetres taller is (\w+) than the shortest child in the table\?$/.exec(prompt);
    if (height) {
      expect(picture.columns[0]).toBe('Height (cm)');
      expect(values.every(value => value >= 110 && value <= 150)).toBe(true);
      const low = Math.min(...values);
      expect(values.filter(value => value === low)).toHaveLength(1);
      return { unit: 'cm', high: read(counts, height[1]), low };
    }
    const clubs = /^How many more children chose (\w+) than chose (\w+)\?$/.exec(prompt);
    if (!clubs) throw new Error('Expected two named clubs');
    expect(picture.columns[0]).toBe('Number of children');
    expect(values.every(value => value > 0 && value < 100)).toBe(true);
    return { unit: 'children', high: read(counts, clubs[1]), low: read(counts, clubs[2]) };
  }
  if (picture?.type !== 'batch4-early') throw new Error('Expected a picture graph');
  const pairs = /^How many more stamps did (\w+) and (\w+) collect together than (\w+) and (\w+) did together\?$/.exec(prompt);
  if (!pairs) throw new Error('Expected two named pairs');
  expect(new Set(pairs.slice(1)).size).toBe(4);
  expect(picture.rows).toHaveLength(4);
  expect([1, 2, 3, 4, 5]).toContain(picture.scale);
  const stamps = new Map<string, number>();
  for (const row of picture.rows) {
    expect(row.halfSymbol).toBe(false);
    expect(Number.isInteger(row.wholeSymbols) && row.wholeSymbols >= 1 && row.wholeSymbols <= 8).toBe(true);
    stamps.set(row.label, row.wholeSymbols * picture.scale);
  }
  return { unit: 'stamps', high: read(stamps, pairs[1]) + read(stamps, pairs[2]),
    low: read(stamps, pairs[3]) + read(stamps, pairs[4]) };
}

it('solves all three comparisons from the displayed rows, units and named groups', () => {
  const units = new Set<string>();
  const scales = new Set<number>();
  let comparedMiddleHeight = false;
  for (let seed = -16; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { unit, high, low } = solve(q);
      const expected = String(high - low);
      expect(high).toBeGreaterThan(low);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe(unit);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${high} − ${low} = ${expected}`);
      units.add(unit);
      if (q.picture?.type === 'batch4-early') {
        scales.add(q.picture.scale);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      } else {
        expect(q.choices).toBeUndefined();
        if (unit === 'cm' && q.picture?.type === 'nanyang-p4' && q.picture.layout === 'table') {
          comparedMiddleHeight ||= q.picture.rows.some(row => Number(row.values[0]) > high);
        }
      }
    }
  }
  expect([...units].sort()).toEqual(['children', 'cm', 'stamps']);
  expect([...scales].sort()).toEqual([1, 2, 3, 4, 5]);
  expect(comparedMiddleHeight).toBe(true);
});

it('replays a question exactly and varies the displayed rows across indices', () => {
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
  const layouts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(23, index);
    expect(makeRagQuestion(23, index)).toEqual(q);
    layouts.add(JSON.stringify(q.picture));
  }
  expect(layouts.size).toBeGreaterThan(4);
});
