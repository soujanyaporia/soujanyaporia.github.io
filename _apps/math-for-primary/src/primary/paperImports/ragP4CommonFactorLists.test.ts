import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4CommonFactorLists';

it('solves every form from the two numbers shown to the pupil', () => {
  const pairsSeen = new Set<string>();
  for (let seed = -4; seed < 44; seed++) {
    const formsSeen = new Set<string>();
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const visible = [...(q.context ?? []), q.prompt].join(' ');
      const givens = (visible.match(/\d+/g) ?? []).map(Number);
      expect(givens).toHaveLength(2);
      const [a, b] = givens;
      expect(a).toBeGreaterThan(0);
      expect(b).toBeGreaterThan(a);
      expect(b).toBeLessThanOrEqual(100);
      pairsSeen.add(`${a},${b}`);

      // Try each possible divisor directly, independently of the factor-pair method.
      const shared: number[] = [];
      for (let n = 1; n <= Math.min(a, b); n++) {
        if (a % n === 0 && b % n === 0) shared.push(n);
      }
      if (q.prompt.startsWith('Write all')) {
        formsSeen.add('list');
        expect(q.prompt).toContain('Start with the smallest');
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw new Error('Expected integer fields for the factor list');
        expect(spec.fields).toHaveLength(shared.length);
        expect(shared.length).toBeGreaterThanOrEqual(2);
        expect(shared.length).toBeLessThanOrEqual(6);
        const entries = shared.map(String);
        expect(q.answer).toBe(JSON.stringify(entries));
        const accepted = (values: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(values));
        expect(accepted(entries)).toBe(true);
        expect(accepted(entries.slice(1))).toBe(false);
        expect(accepted([entries[0], ...entries.slice(0, -1)])).toBe(false);
        expect(accepted([...entries].reverse())).toBe(false);
      } else if (q.prompt.startsWith('Add all')) {
        formsSeen.add('sum');
        const sum = String(shared.reduce((total, n) => total + n, 0));
        expect(q.answer).toBe(sum);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(choice => Number(choice) === Number(sum))).toEqual([sum]);
        expect(b % a).toBe(0);
      } else if (q.prompt.startsWith('How many different factors')) {
        formsSeen.add('count');
        expect(q.answer).toBe(String(shared.length));
        expect(q.choices).toBeUndefined();
      } else {
        expect(q.prompt).toContain('greatest number of bags');
        formsSeen.add('bags');
        const bags = Math.max(...shared);
        expect(q.answer).toBe(String(bags));
        expect(q.unit).toBe('bags');
        expect(Number.isInteger(a / bags) && Number.isInteger(b / bags)).toBe(true);
      }
    }
    expect(formsSeen.size).toBe(4);
  }
  expect(pairsSeen.size).toBeGreaterThan(20);
});

it('reproduces the same question and choices for the same seed and index', () => {
  for (const seed of [-9, 0, 37, 105]) {
    for (let index = 0; index < 8; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
