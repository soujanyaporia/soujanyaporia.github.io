import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP4BoundedCommonMultiples';

function solveVisibleQuestion(q: Question) {
  const [limits, ...clues] = q.context ?? [];
  if (!limits || !clues.length) throw new Error('Missing limits or factor clues');
  const factors = (clues.join(' ').match(/\d+/g) ?? []).map(Number);
  expect([2, 3]).toContain(factors.length);
  expect(new Set(factors).size).toBe(factors.length);
  expect(factors.every(factor => factor >= 2 && factor <= 9)).toBe(true);

  const bounds = (limits.match(/\d+/g) ?? []).map(Number);
  const digits = /smallest (\d+)-digit/.exec(q.prompt);
  const list = q.prompt.startsWith('Write all');
  let first: number;
  let last: number;
  if (list) {
    expect(limits).toContain('positive and less than');
    expect(bounds).toHaveLength(1);
    first = 1;
    last = bounds[0] - 1;
  } else if (digits) {
    expect(limits).toContain('greater than');
    expect(bounds).toHaveLength(1);
    const length = Number(digits[1]);
    expect([2, 3]).toContain(length);
    first = Math.max(bounds[0] + 1, 10 ** (length - 1));
    last = 10 ** length - 1;
  } else {
    expect(bounds).toHaveLength(2);
    expect(limits).toMatch(/greater than|more than/);
    expect(limits).toMatch(/less than|fewer than/);
    first = bounds[0] + 1;
    last = bounds[1] - 1;
  }

  const hits: string[] = [];
  for (let value = first; value <= last; value++) {
    if (factors.every(factor => value % factor === 0)) hits.push(String(value));
  }
  return { hits, factors, list, least: Boolean(digits), bounds };
}

test('entry and list controls mark the solutions obtained by scanning the visible limits', () => {
  const forms = new Set<string>();
  const inputs = new Set<string>();
  let excludedCommonEndpoint = false;
  for (let seed = -8; seed < 72; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { hits, factors, list, least, bounds } = solveVisibleQuestion(q);
      expect(hits.length).toBeGreaterThan(0);
      inputs.add(JSON.stringify(q.context));
      if (list) {
        forms.add('list');
        expect(q.prompt).toContain('smallest to largest');
        expect(q.structuredResponse?.kind).toBe('number-fields');
        if (q.structuredResponse?.kind !== 'number-fields') throw new Error('Missing list fields');
        expect(q.structuredResponse.fields).toHaveLength(hits.length);
        expect(hits.length).toBeGreaterThan(1);
        const expected = JSON.stringify(hits);
        expect(q.answer).toBe(expected);
        expect(correctAnswer(q, expected)).toBe(true);
        expect(correctAnswer(q, JSON.stringify(hits.slice(1)))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([...hits.slice(0, -1), String(bounds[0])]))).toBe(false);
        if (factors.every(factor => bounds[0] % factor === 0)) excludedCommonEndpoint = true;
      } else {
        forms.add(least ? 'least' : q.unit === 'beads' ? 'beads' : 'number');
        if (!least) expect(hits).toHaveLength(1);
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(hits[0]);
        expect(correctAnswer(q, hits[0])).toBe(true);
        for (const endpoint of bounds) expect(correctAnswer(q, String(endpoint))).toBe(false);
        if (least && hits.length > 1) expect(correctAnswer(q, hits[1])).toBe(false);
      }
    }
  }
  expect(forms).toEqual(new Set(['beads', 'number', 'least', 'list']));
  expect(excludedCommonEndpoint).toBe(true);
  expect(inputs.size).toBeGreaterThan(30);
});

test('a seed and index reproduce the same question and working', () => {
  for (const seed of [0, 17, 103]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
  }
});
