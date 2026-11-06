import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragSumDifferenceTwoParts';

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern} in ${text}`);
  return Number(match[1]);
}

// Try possible smaller parts. The other part is whatever remains of the total.
function solvePair(total: number, gap: number): number {
  expect(total).toBeLessThanOrEqual(9999);
  expect(gap).toBeGreaterThan(0);
  const matches: number[] = [];
  for (let first = 1; first * 2 < total; first++) {
    const other = total - first;
    if (other - first === gap) matches.push(first);
  }
  expect(matches).toHaveLength(1);
  expect(2 * matches[0]).toBeLessThanOrEqual(999);
  return matches[0];
}

test('the visible total, comparison and requested person or group determine the answer', () => {
  const forms = new Set<string>();
  const totals = new Set<number>();
  for (const seed of [-37, 0, 1, 5, 23, 109, 2701]) {
    for (let index = 0; index < 14; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      let total: number, gap: number, factor = 1, elapsed = 0;
      if (q.prompt === 'How old is Amir now?') {
        total = read(text, /ages added up to (\d+) years/);
        gap = read(text, /Nora is (\d+) years older than Amir/);
        elapsed = read(text, /(\d+) years ago/);
        expect(elapsed).toBeGreaterThan(0);
        expect(q.unit).toBe('years');
      } else if (q.prompt === 'How many beads does Jo have?') {
        total = read(text, /Mira and Ravi have (\d+) beads between them/);
        gap = read(text, /Ravi has (\d+) more beads than Mira/);
        factor = read(text, /Jo has (\d+) times as many beads as Mira/);
        expect(factor).toBeGreaterThan(1);
        expect(factor).toBeLessThan(10);
        expect(q.unit).toBe('beads');
      } else if (q.prompt === 'How many books did the library lend on Monday?') {
        total = read(text, /lent (\d+) books altogether on Monday and Tuesday/);
        gap = read(text, /lent (\d+) more books on Tuesday than on Monday/);
        expect(q.unit).toBe('books');
      } else {
        expect(q.prompt).toBe('Which number is on the card with the lower value?');
        total = read(text, /two cards add up to (\d+)/);
        gap = read(text, /One number is (\d+) greater than the other/);
        expect(q.unit).toBeUndefined();
      }
      const smaller = solvePair(total, gap);
      const expected = smaller * factor + elapsed;
      expect(q.answer).toBe(String(expected));
      expect(q.picture).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.choices).toBeUndefined();
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations?.slice(0, 2)).toEqual([`${total} − ${gap} = ${2 * smaller}`, `${2 * smaller} ÷ 2 = ${smaller}`]);
      if (factor > 1) expect(equations?.[2]).toBe(`${smaller} × ${factor} = ${expected} beads`);
      if (elapsed > 0) expect(equations?.[2]).toBe(`${smaller} + ${elapsed} = ${expected} years`);
      forms.add(q.prompt);
      totals.add(total);
    }
  }
  expect(forms.size).toBe(4);
  expect(totals.size).toBeGreaterThan(20);
  expect(Math.max(...totals)).toBeGreaterThanOrEqual(1000);
});

test('a seed and index reproduce the same exercise', () => {
  expect(makeRagQuestion(29)).toEqual(makeRagQuestion(29, 0));
  expect(makeRagQuestion(29, 4)).toEqual(makeRagQuestion(29, 4));
});
