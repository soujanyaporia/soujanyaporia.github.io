import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragMissingPlaceValuePart';

function readEquality(display: string) {
  const count = /^(\d+) = (\d+) tens? \+ □ ones$/.exec(display);
  if (count) return { form: 'tens count', total: Number(count[1]), knownValue: 10 * Number(count[2]), boxUnit: 1 };

  const value = /^(\d+) \+ □ = (\d+)$/.exec(display);
  if (value) return { form: 'tens value', total: Number(value[2]), knownValue: Number(value[1]), boxUnit: 1 };

  const ones = /^(\d+) ones = □ tens \+ (\d+) ones?$/.exec(display);
  if (ones) return { form: 'ones count', total: Number(ones[1]), knownValue: Number(ones[2]), boxUnit: 10 };
  throw new Error(`Cannot read the displayed equality: ${display}`);
}

it('finds the unique entry by putting whole-number counts into the visible box', () => {
  const groupings = new Set<string>();
  const displays = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const display = q.display ?? '';
      const { form, total, knownValue, boxUnit } = readEquality(display);
      expect(total).toBeGreaterThanOrEqual(10);
      expect(total).toBeLessThanOrEqual(99);
      if (boxUnit === 1) expect(knownValue % 10).toBe(0);
      else expect(knownValue).toBeGreaterThanOrEqual(10);

      const solutions: number[] = [];
      for (let entry = 0; entry <= total; entry++) {
        if (knownValue + entry * boxUnit === total) solutions.push(entry);
      }
      expect(solutions).toHaveLength(1);
      expect(q.answer).toBe(String(solutions[0]));
      const looseOnes = boxUnit === 1 ? solutions[0] : knownValue;
      groupings.add(`${form}/${looseOnes >= 10 ? 'ten or more' : 'under ten'}`);
      displays.add(display);
    }
  }
  expect(groupings).toEqual(new Set([
    'tens count/under ten', 'tens count/ten or more',
    'tens value/under ten', 'tens value/ten or more', 'ones count/ten or more',
  ]));
  expect(displays.size).toBeGreaterThan(30);
});

it('replays the same item and varies the visible givens across indices', () => {
  expect(makeRagQuestion(32)).toEqual(makeRagQuestion(32, 0));
  const displays = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(32, index);
    expect(makeRagQuestion(32, index)).toEqual(question);
    displays.add(question.display ?? '');
  }
  expect(displays.size).toBeGreaterThan(1);
});
