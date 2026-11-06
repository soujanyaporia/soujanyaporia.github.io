import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP2WrittenArithmeticDigits';

function readWorking(q: Question) {
  const p = q.picture;
  if (p?.type === 'missing-column') {
    expect(p.target).toBe('A');
    expect(q.prompt).toContain('space A');
    expect(q.context?.join(' ')).toMatch(/different digits/);
    return { rows: [p.top, p.bottom, p.total].map(row => row.join('')), op: p.operation, distinct: true };
  }
  if (p?.type !== 'nanyang-p4' || p.layout !== 'table') throw Error('Expected a place-value table');
  expect(p.columns).toEqual(['Hundreds', 'Tens', 'Ones']);
  const op = p.rows[1].label[0];
  expect(['+', '−']).toContain(op);
  let holes = 0;
  // Name the spaces in reading order for the search.
  const rows = p.rows.map(row => row.values.map(v => v === null ? 'AB'[holes++] : String(v)).join(''));
  expect(holes).toBe(op === '+' ? 1 : 2);
  return { rows, op, distinct: false };
}

function solve(rows: string[], op: string, distinct: boolean) {
  const hasB = rows.some(row => row.includes('B'));
  const solutions: { a: number; b: number; values: number[] }[] = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= (hasB ? 9 : 0); b++) {
      if (distinct && a === b) continue;
      const values = rows.map(row => Number(row.replaceAll('A', String(a)).replaceAll('B', String(b))));
      if (!values.every(n => Number.isInteger(n) && n >= 100 && n <= 999)) continue;
      const [top, lower, result] = values;
      if ((op === '+' ? top + lower : top - lower) === result) solutions.push({ a, b, values });
    }
  }
  return solutions;
}

it('recovers exactly one completion from the visible rows and grades the requested digits in order', () => {
  const examples = new Map<string, Set<string>>();
  for (let seed = -3; seed < 33; seed++) {
    const kinds = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { rows, op, distinct } = readWorking(q);
      expect(rows).toHaveLength(3);
      for (const row of rows) expect(row).toMatch(/^[1-9AB][0-9AB]{2}$/);
      const solutions = solve(rows, op, distinct);
      expect(solutions).toHaveLength(1);
      const { a, b, values: [top, lower, result] } = solutions[0];
      const mask = rows.map(row => row.replace(/\d/g, '#')).join('/');
      kinds.add(mask);
      if (!examples.has(mask)) examples.set(mask, new Set());
      examples.get(mask)!.add(rows.join('/'));

      if (op === '−') {
        expect(mask).toBe('###/#A#/B##');
        expect(rows[0][1]).toBe('0');
        expect(top % 10).toBeGreaterThanOrEqual(lower % 10);
        expect(Number(rows[2][1])).toBeGreaterThan(0);
        const response = q.structuredResponse;
        if (response?.kind !== 'number-pair') throw Error('Expected two digit fields');
        expect([response.firstLabel, response.secondLabel]).toEqual(['Tens in the second row', 'Hundreds in the answer row']);
        const entry = JSON.stringify([String(a), String(b)]);
        expect(q.answer).toBe(entry);
        expect(structuredResponseCorrect(response, q.answer, entry)).toBe(true);
        const wrong = JSON.stringify([String(a), String((b + 1) % 10)]);
        expect(structuredResponseCorrect(response, q.answer, wrong)).toBe(false);
      } else {
        expect(mask).toBe(distinct ? '#A#/##B/###' : '###/##A/###');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(a));
        expect(top % 10 + lower % 10).toBeGreaterThanOrEqual(10);
        expect(Math.floor(result / 100)).toBe(Math.floor(top / 100) + Math.floor(lower / 100) + 1);
        if (distinct) {
          expect(result % 10).toBe(0);
          expect(a).not.toBe(b);
        }
      }
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${top} ${op} ${lower} = ${result}`);
    }
    expect(kinds.size).toBe(3);
  }
  for (const instances of examples.values()) expect(instances.size).toBeGreaterThan(10);
});

it('reproduces a question for the same seed and index, with index zero as the default', () => {
  expect(makeRagQuestion(41)).toEqual(makeRagQuestion(41, 0));
  expect(makeRagQuestion(-8, 5)).toEqual(makeRagQuestion(-8, 5));
});
