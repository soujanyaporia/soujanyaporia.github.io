import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragSubtractionBalance';

it('has exactly one whole-number entry that balances the displayed equation', () => {
  const displays = new Set<string>();
  const entries = new Set<number>();
  for (let seed = -12; seed <= 36; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const display = q.display ?? '';
      const match = /^(\d+) − (\d+) = (\d+) − □$/.exec(display);
      if (!match) throw new Error(`Expected one box after the second minus sign in ${display}`);
      const [leftStart, leftTaken, rightStart] = match.slice(1).map(Number);
      for (const given of [leftStart, leftTaken, rightStart]) {
        expect(given).toBeGreaterThanOrEqual(10);
        expect(given).toBeLessThan(100);
      }
      expect(leftStart % 10).toBe(leftTaken % 10);
      expect(rightStart % 10).toBe(0);
      const leftResult = leftStart - leftTaken;
      expect(leftResult).toBeGreaterThan(0);
      const solutions: number[] = [];
      for (let entry = 0; entry <= rightStart; entry++) {
        if (entry + leftResult === rightStart) solutions.push(entry);
      }
      expect(solutions).toHaveLength(1);
      const [solution] = solutions;
      expect(solution).toBeGreaterThan(0);
      expect(solution).not.toBe(leftResult);
      expect(q.answer).toBe(String(solution));
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${leftStart} − ${leftTaken} = ${leftResult}`,
        `${rightStart} − ${leftResult} = ${solution}`,
        `${rightStart} − ${solution} = ${leftResult}`,
      ]);
      displays.add(display);
      entries.add(solution);
    }
  }
  expect(displays.size).toBeGreaterThan(12);
  expect(entries.size).toBeGreaterThan(2);
});

it('repeats a seeded question and varies the exercise across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const displays = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    displays.add(q.display!);
  }
  expect(displays.size).toBeGreaterThan(1);
});
