import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragDivisibilityAndRemainderConstraints';

function readPair(text: string, pattern: RegExp): [number, number] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens in ${text}`);
  return [Number(match[1]), Number(match[2])];
}

it('solves all three tasks from their visible clues across seeds and indices', () => {
  const edgeCases = new Set<string>();
  for (let seed = -12; seed < 96; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const clues = (q.context ?? []).join(' ');
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);

      if (q.prompt.includes('extra badges')) {
        forms.add('packing');
        const [badges, size] = readPair(clues, /has (\d+) badges.*bags of exactly (\d+) badges/);
        expect(size).toBeGreaterThanOrEqual(2);
        expect(size).toBeLessThanOrEqual(9);
        expect(badges).toBeLessThanOrEqual(999);
        // Try additions in order, including buying nothing.
        let least = 0;
        while (least < size && !Number.isInteger((badges + least) / size)) least++;
        expect(least).toBeLessThan(size);
        expect(q.answer).toBe(String(least));
        expect(q.unit).toBe('badges');
        expect(q.choices).toBeUndefined();
        if (least === 0) edgeCases.add('already full');
        if (least === size - 1) edgeCases.add('one badge left');
      } else if (q.choices) {
        forms.add('addend');
        const [divisor, remainder] = readPair(clues, /divided by (\d+) leaves a remainder of (\d+)/);
        expect(q.prompt).toContain(`divides exactly by ${divisor}`);
        expect(remainder).toBeGreaterThan(0);
        expect(remainder).toBeLessThan(divisor);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        // Make a possible starting number and try each printed choice against it.
        const start = 3 * divisor + remainder;
        const valid = q.choices.filter(choice => Number.isInteger((start + Number(choice)) / divisor));
        expect(valid).toHaveLength(1);
        expect(q.answer).toBe(valid[0]);
        if (Number(valid[0]) > divisor) edgeCases.add('larger valid addend');
      } else {
        forms.add('interval');
        const [lower, upper] = readPair(clues, /greater than (\d+) and less than (\d+)/);
        const [divisor, remainder] = readPair(clues, /Dividing it by (\d+) leaves a remainder of (\d+)/);
        const solutions: number[] = [];
        for (let n = lower + 1; n < upper; n++) {
          if (n % divisor === remainder) solutions.push(n);
        }
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(String(solutions[0]));
        if (lower % divisor === remainder || upper % divisor === remainder) edgeCases.add('excluded endpoint');
      }
    }
    expect(forms.size).toBe(3);
  }
  expect(edgeCases).toEqual(new Set(['already full', 'one badge left', 'larger valid addend', 'excluded endpoint']));
});

it('reproduces the same question for the same seed and index', () => {
  for (const seed of [-5, 0, 47]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (const index of [1, 2, 9]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
