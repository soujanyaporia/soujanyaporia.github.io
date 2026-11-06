import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4ExtremeDigitArrangements';

// Enumerate whole numerals and check their numeric properties; do not use the
// generator's choice of last digit or its ordering of the other places.
function legalValues(cards: string[], length: number, target: string): number[] {
  const values: number[] = [];
  function visit(prefix: string, left: string[]) {
    if (!left.length) {
      const n = Number(prefix);
      if (prefix.length !== length) return;
      if (target === 'multiple of 5' ? n % 5 === 0 : n % 2 === Number(target === 'odd number')) values.push(n);
      return;
    }
    left.forEach((card, i) => {
      if (prefix === '' && card === '0') return;
      visit(prefix + card, left.filter((_, j) => j !== i));
    });
  }
  visit('', cards);
  return values;
}

it('finds the requested extreme from the displayed cards for all four variants', () => {
  const modes = new Set<string>();
  const oddLengths = new Set<number>();
  const fiveEndings = new Set<string>();
  let smallestWithInternalZero = false;
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const request = /the (smallest|largest) ([45])-digit (even number|odd number|multiple of 5)\b/.exec(q.prompt);
      if (!request) throw new Error(`Unclear task: ${q.prompt}`);
      const [, size, count, target] = request;
      const cards = (q.display ?? '').split(', ');
      expect(cards.every(c => /^\d$/.test(c))).toBe(true);
      expect(new Set(cards).size).toBe(cards.length);
      expect(cards).toHaveLength(Number(count));
      expect(q.context?.join(' ')).toMatch(/use every card once/i);
      const valid = legalValues(cards, Number(count), target);
      expect(valid.length).toBeGreaterThan(0);
      const expected = String(size === 'smallest' ? Math.min(...valid) : Math.max(...valid));
      expect(q.answer).toBe(expected);
      modes.add(`${size} ${target}`);
      if (target === 'odd number') oddLengths.add(Number(count));
      if (target === 'multiple of 5') fiveEndings.add(expected.slice(-1));
      if (size === 'smallest' && expected.slice(1, -1).includes('0')) smallestWithInternalZero = true;
    }
  }
  expect(modes).toEqual(new Set(['smallest even number', 'largest odd number', 'largest even number', 'largest multiple of 5']));
  expect(oddLengths).toEqual(new Set([4, 5]));
  expect(fiveEndings).toEqual(new Set(['0', '5']));
  expect(smallestWithInternalZero).toBe(true);
});

it('reproduces the pupil task and its working for the same seed and index', () => {
  const first = makeRagQuestion(83, 2);
  makeRagQuestion(17, 5);
  expect(makeRagQuestion(83, 2)).toEqual(first);
});
