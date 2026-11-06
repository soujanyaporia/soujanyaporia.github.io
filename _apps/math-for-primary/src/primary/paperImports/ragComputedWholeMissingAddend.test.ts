import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragComputedWholeMissingAddend';

function readDisplay(display: string) {
  const more = /^(\d+) \+ □ = (\d+) more than (\d+)$/.exec(display);
  if (more) {
    const known = Number(more[1]);
    const change = Number(more[2]);
    const start = Number(more[3]);
    return { form: 'increase', known, start, change, total: start + change };
  }
  const difference = /^(\d+) − (\d+) (=|is equal to) (\d+) \+ □$/.exec(display);
  if (!difference) throw new Error(`Cannot read the two sides of ${display}`);
  const start = Number(difference[1]);
  const change = Number(difference[2]);
  return { form: difference[3], known: Number(difference[4]), start, change, total: start - change };
}

test('exactly one whole number makes the displayed sides equal', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, known, start, change, total } = readDisplay(q.display ?? '');
      forms.add(form);
      const solutions = Array.from({ length: 101 }, (_, n) => n).filter(n => known + n === total);
      expect(solutions).toHaveLength(1);
      const solution = solutions[0];
      expect(solution).toBeGreaterThan(0);
      expect(q.answer).toBe(String(solution));
      expect(known).toBeGreaterThan(0);
      expect(change).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(100);
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();

      if (form === 'increase') {
        expect(change).toBe(10);
        expect(known).toBeLessThanOrEqual(total % 10);
        expect(q.choices).toBeUndefined();
      } else {
        expect(start).toBeLessThanOrEqual(20);
        expect(q.choices).toHaveLength(4);
        const choices = (q.choices ?? []).map(Number);
        expect(new Set(choices).size).toBe(4);
        expect(choices.every(n => Number.isInteger(n) && n >= 0 && n <= 20)).toBe(true);
        expect(choices.filter(n => known + n === total)).toEqual([solution]);
      }
      const sign = form === 'increase' ? '+' : '−';
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${start} ${sign} ${change} = ${total}`,
        `${total} − ${known} = ${solution}`,
        `${known} + ${solution} = ${total}`,
      ]);
    }
  }
  expect(forms).toEqual(new Set(['increase', '=', 'is equal to']));
});

test('a seed and index reproduce the same exercise and option order', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  const displays = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    displays.add(q.display ?? '');
  }
  expect(displays.size).toBeGreaterThan(8);
});
