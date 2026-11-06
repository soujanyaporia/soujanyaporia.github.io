import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragParitySelectionFromList';

it('solves each task from the numbers the pupil sees', () => {
  const seen = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const labels = q.choices ?? q.display?.split(', ') ?? [];
      expect(labels).toHaveLength(4);
      expect(new Set(labels).size).toBe(4);
      const digitPattern = q.choices ? /^[1-9]\d{3}$/ : /^[1-9]\d{2}$/;
      expect(labels.every(label => digitPattern.test(label))).toBe(true);

      const even = labels.filter(label => /[02468]$/.test(label)).map(Number);
      const odd = labels.filter(label => /[13579]$/.test(label)).map(Number);
      let expected: number;
      if (q.prompt === 'Pick the odd number.') {
        seen.add('only-odd');
        expect(odd).toHaveLength(1);
        expected = odd[0];
      } else if (q.prompt === 'Choose the smaller of the even numbers.') {
        seen.add('least-even');
        expect(even).toHaveLength(2);
        expected = Math.min(...even);
        expect(Math.min(...odd)).toBeLessThan(expected);
      } else {
        seen.add('sum');
        expect(q.prompt).toMatch(/largest odd.*smallest even.*add up/);
        expect(q.choices).toBeUndefined();
        expect(even).toHaveLength(2);
        expect(odd).toHaveLength(2);
        const addend = Math.max(...odd);
        const other = Math.min(...even);
        expected = addend + other;
        expect(q.workedSteps?.at(-1)?.equation).toBe(`${addend} + ${other} = ${expected}`);
      }
      if (!seen.has('sum') || !q.prompt.includes('add up')) {
        expect(q.choices).toContain(String(expected));
      }
      expect(q.answer).toBe(String(expected));
    }
  }
  expect(seen).toEqual(new Set(['only-odd', 'least-even', 'sum']));
});

it('repeats the same item for a seed and index while varying the visible lists across indices', () => {
  const lists = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(37, index);
    expect(q).toEqual(makeRagQuestion(37, index));
    lists.add(q.choices?.join(', ') ?? q.display ?? '');
  }
  expect(lists.size).toBeGreaterThan(1);
});
