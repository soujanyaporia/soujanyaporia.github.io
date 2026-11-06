import { expect, test } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4IndexedCommonMultiples';

test('solves each response task by checking positive integers against both visible table numbers', () => {
  const seen = new Set<string>();
  const operandPairs = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const givens = q.context?.join(' ') ?? '';
      expect(givens).toContain('positive multiples');
      const numbers = (givens.match(/\d+/g) ?? []).map(Number);
      expect(numbers).toHaveLength(2);
      const [a, b] = numbers;
      expect(a).toBeGreaterThanOrEqual(2);
      expect(b).toBeGreaterThan(a);
      expect(b).toBeLessThanOrEqual(9);
      operandPairs.add(`${a},${b}`);

      // Enumerate from 1, independently of the generator's table-stepping method.
      const shared: number[] = [];
      for (let n = 1; n <= 4 * a * b && shared.length < 4; n++) {
        if (n % a === 0 && n % b === 0) shared.push(n);
      }
      expect(shared).toHaveLength(4);
      const [smallest, next] = shared;
      if (q.prompt.includes('their sum')) {
        seen.add('sum');
        const expected = String(smallest + next);
        expect(q.answer).toBe(expected);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(choice => Number(choice) === Number(expected))).toEqual([expected]);
        expect(q.structuredResponse).toBeUndefined();
      } else if (q.prompt.includes('smaller one first')) {
        seen.add('pair');
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Expected two ordered number fields');
        const entry = JSON.stringify([String(smallest), String(next)]);
        expect(q.answer).toBe(entry);
        expect(structuredResponseCorrect(spec, q.answer, entry)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(next), String(smallest)]))).toBe(false);
        expect(q.choices).toBeUndefined();
      } else {
        const match = /comes (second|third|fourth)\?/.exec(q.prompt);
        if (!match) throw new Error(`Missing position in ${q.prompt}`);
        const ordinals = ['first', 'second', 'third', 'fourth'];
        seen.add(match[1]);
        expect(q.answer).toBe(String(shared[ordinals.indexOf(match[1])]));
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toBeUndefined();
      }
    }
  }
  expect(seen).toEqual(new Set(['pair', 'second', 'third', 'fourth', 'sum']));
  expect(operandPairs.has('6,8')).toBe(true);
  expect(operandPairs.has('4,8')).toBe(true);
  expect(operandPairs.has('4,6') || operandPairs.has('3,5')).toBe(false);
});

test('reproduces the question and choice order for the same seed and index', () => {
  for (let index = 0; index < 16; index++) {
    expect(makeRagQuestion(47, index)).toEqual(makeRagQuestion(47, index));
  }
});
