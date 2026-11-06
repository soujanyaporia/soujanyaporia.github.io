import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragSubtractByPlaceValue';

function readGivens(q: Question) {
  if (q.picture) {
    const table = q.picture;
    if (table.type !== 'nanyang-p4' || table.layout !== 'table') throw new Error('Expected a place-value table');
    expect(table.columns).toEqual(['Tens', 'Ones']);
    expect(table.rows.map(row => row.label)).toEqual(['Start', 'Subtract (−)', 'Answer']);
    expect(table.rows[2].values).toEqual([null, null]);
    const readRow = (digits: (number | null)[]) => {
      expect(digits).toHaveLength(2);
      const [tens, ones] = digits;
      if (tens === null || ones === null) throw new Error('Missing operand digit');
      expect(String(tens)).toMatch(/^[1-9]$/);
      expect(String(ones)).toMatch(/^\d$/);
      return 10 * tens + ones;
    };
    return { start: readRow(table.rows[0].values), take: readRow(table.rows[1].values), format: 'column' as const };
  }

  const match = /^(\d+) − (\d+) = □(?: tens and (\d+) (?:one|ones))?$/.exec(q.display ?? '');
  if (!match) throw new Error('Expected a subtraction with a visible answer box');
  return {
    start: Number(match[1]), take: Number(match[2]),
    format: match[3] === undefined ? 'across-ten' as const : 'tens-digit' as const,
    givenOnes: match[3] === undefined ? undefined : Number(match[3]),
  };
}

it('solves each visible subtraction and checks the requested response', () => {
  const columnTrades = new Set<boolean>();
  for (let seed = -12; seed <= 52; seed++) {
    const formats = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const givens = readGivens(q);
      const { start, take, format } = givens;
      formats.add(format);
      const difference = start - take;
      const expected = String(format === 'tens-digit' ? Math.floor(difference / 10) : difference);
      expect(start).toBeLessThanOrEqual(99);
      expect(take).toBeGreaterThan(0);
      expect(difference).toBeGreaterThanOrEqual(10);
      expect(q.answer).toBe(expected);

      const needsTrade = start % 10 < take % 10;
      const available = start % 10 + (needsTrade ? 10 : 0);
      expect(q.workedSteps?.map(s => s.equation)).toContain(`${available} − ${take % 10} = ${difference % 10}`);
      if (format === 'column') {
        expect(q.choices).toBeUndefined();
        columnTrades.add(needsTrade);
      } else {
        expect(needsTrade).toBe(true);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        if (givens.format === 'tens-digit') {
          expect(take).toBeGreaterThanOrEqual(10);
          expect(start % 10).toBe(0);
          expect(givens.givenOnes).toBe(difference % 10);
          expect(givens.givenOnes).not.toBe(Number(expected));
        } else {
          expect(take).toBeLessThan(10);
        }
      }
    }
    expect(formats).toEqual(new Set(['across-ten', 'column', 'tens-digit']));
  }
  expect(columnTrades).toEqual(new Set([true, false]));
});

it('repeats a seed and index exactly while varying the visible operands across seeds', () => {
  const pairs = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { start, take } = readGivens(q);
      pairs.add(`${start}/${take}`);
    }
  }
  expect(pairs.size).toBeGreaterThan(32);
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
});
