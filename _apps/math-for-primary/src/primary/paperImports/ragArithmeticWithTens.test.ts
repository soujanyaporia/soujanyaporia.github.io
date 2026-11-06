import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragArithmeticWithTens';

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Cannot read the givens in ${text}`);
  return match.slice(1).map(Number);
}

it('solves each form from the words shown to the pupil', () => {
  const paired = new Set<string>();
  const subtraction = new Set<string>();
  const addition = new Set<string>();
  for (let seed = -12; seed < 28; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.picture).toBeUndefined();
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      if (q.structuredResponse) {
        const spec = q.structuredResponse;
        if (spec.kind !== 'number-pair') throw new Error('Expected two ordered number boxes');
        const [first] = readNumbers(spec.firstLabel, /comes just before (\d+)\?$/);
        const [second] = readNumbers(spec.secondLabel, /Add one ten to (\d+)\./);
        expect(first % 10).toBe(0);
        expect(second % 10).toBe(0);
        expect(first).not.toBe(second);
        expect(first).not.toBe(90);
        expect(second).not.toBe(50);
        const expected = [String(first - 1), String(second + 10)];
        expect(first - 1).toBeGreaterThanOrEqual(0);
        expect(second + 10).toBeLessThanOrEqual(100);
        expect(q.answer).toBe(JSON.stringify(expected));
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...expected].reverse()))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0], '']))).toBe(false);
        paired.add(`${first},${second}`);
        forms.add('pair');
      } else if (q.choices) {
        const [tens, ones, extra] = readNumbers(q.prompt, /have (\d+) tens and (\d+) ones\. You get (\d+) more tens\./);
        let total = 10 * tens + ones;
        for (let step = 0; step < extra; step++) total += 10;
        expect(extra).toBeGreaterThan(1);
        expect(ones).toBeGreaterThan(0);
        expect(total % 10).toBe(ones);
        expect(total).toBeLessThanOrEqual(99);
        expect(q.answer).toBe(String(total));
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => Number(choice) === total)).toHaveLength(1);
        for (const choice of q.choices) {
          expect(choice).toMatch(/^\d+$/);
          expect(Number(choice)).toBeLessThanOrEqual(100);
        }
        addition.add(q.prompt);
        forms.add('add');
      } else {
        const [tens, take] = readNumbers(q.prompt, /Start with (\d+) tens\. Take away (\d+) ones\./);
        const start = 10 * tens;
        expect(take).toBeGreaterThan(0);
        expect(take).toBeLessThan(10);
        expect(start).toBeLessThanOrEqual(100);
        expect(start - take).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBe(String(start - take));
        subtraction.add(q.prompt);
        forms.add('subtract');
      }
    }
    expect(forms.size).toBe(3);
  }
  for (const givens of [paired, subtraction, addition]) expect(givens.size).toBeGreaterThan(1);
});

it('reproduces the givens, choices and worked solution for the same seed and index', () => {
  expect(makeRagQuestion(7)).toEqual(makeRagQuestion(7, 0));
  for (const seed of [-17, 0, 51]) {
    for (const index of [0, 1, 2, 8]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
