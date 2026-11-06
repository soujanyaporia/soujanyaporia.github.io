import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP4DecimalOrderAndMinimum';

// Read each printed label as a ratio. Compare by cross multiplication.
function ratio(label: string): [number, number] {
  if (label.includes('/')) {
    expect(label).toMatch(/^\d+\/[1-9]\d*$/);
    const [n, d] = label.split('/').map(Number);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(d);
    expect(100 % d).toBe(0);
    return [n, d];
  }
  expect(label).toMatch(/^\d+\.\d{1,3}$/);
  const [whole, digits] = label.split('.');
  return [Number(whole + digits), 10 ** digits.length];
}

function compare(a: string, b: string): number {
  const [an, ad] = ratio(a);
  const [bn, bd] = ratio(b);
  return an * bd - bn * ad;
}

it('solves each response from its visible numbers and requested direction', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const minimum = q.prompt.includes('smallest value');
      const descending = q.prompt.includes('largest to smallest');
      const labels = q.order ?? (minimum ? q.choices! : q.display!.split(', '));
      expect(labels).toHaveLength(minimum || descending ? 4 : 3);
      const sorted = [...labels].sort(compare);
      for (let i = 1; i < sorted.length; i++) expect(compare(sorted[i - 1], sorted[i])).toBeLessThan(0);
      const ordered = descending ? [...sorted].reverse() : sorted;
      expect(labels).not.toEqual(ordered);

      let expected: string;
      if (q.order) {
        seen.add('mixed');
        expect(q.prompt).toContain('starting with the smallest');
        expect(labels.filter(label => label.includes('/'))).toHaveLength(1);
        expected = ordered.join(',');
        expect(correctAnswer(q, [...ordered].reverse().join(','))).toBe(false);
      } else if (minimum) {
        seen.add('minimum');
        expected = sorted[0];
      } else {
        seen.add(descending ? 'descending' : 'ascending');
        expect(q.prompt).toContain(descending ? 'largest to smallest' : 'smallest to largest');
        expected = ordered.join(', ');
        for (const row of q.choices!) expect(row.split(', ').sort()).toEqual([...labels].sort());
      }
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
        for (const choice of q.choices) expect(correctAnswer(q, choice)).toBe(choice === expected);
      }
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
    }
  }
  expect(seen).toEqual(new Set(['mixed', 'minimum', 'ascending', 'descending']));
});

it('repeats a seed and index exactly and varies the givens within a session', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(27, index);
    expect(makeRagQuestion(27, index)).toEqual(q);
    givens.add(JSON.stringify(q.order ?? q.display ?? q.choices));
  }
  expect(givens.size).toBeGreaterThan(8);
});
