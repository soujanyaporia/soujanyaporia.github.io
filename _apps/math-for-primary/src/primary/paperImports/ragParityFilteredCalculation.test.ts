import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragParityFilteredCalculation';

it('solves each displayed list by selecting its even numbers and using repeated addition', () => {
  for (const seed of [-91, -1, 0, 1, 18, 253, 2048, 63017]) {
    for (let index = 0; index < 8; index++) {
      const question = makeRagQuestion(seed, index);
      const display = question.display ?? '';
      expect(display).toMatch(/^\d+(, \d+){4}$/);
      const entries = display.split(', ');
      expect(new Set(entries).size).toBe(5);
      expect(entries.filter(value => value.length === 1)).toHaveLength(2);
      expect(entries.filter(value => value.length === 3)).toHaveLength(3);

      const factors = entries.filter(value => /[02468]$/.test(value)).map(Number);
      expect(factors).toHaveLength(2);
      const [small, large] = factors.sort((a, b) => a - b);
      expect(small).toBeGreaterThan(0);
      expect(small).toBeLessThan(10);
      expect(large).toBeGreaterThanOrEqual(100);
      expect(large).toBeLessThan(1000);

      let total = 0;
      for (let group = 0; group < small; group++) total += large;
      expect(question.answer).toBe(String(total));
      expect(question.choices).toBeUndefined();
      expect(question.unit).toBeUndefined();
      const lastStep = question.workedSteps?.at(-1)?.equation ?? '';
      const addends = lastStep.split(' = ')[0].split(' + ').map(Number);
      expect(addends.length).toBeGreaterThan(1);
      expect(addends.reduce((sum, value) => sum + value, 0)).toBe(total);
      expect(lastStep.endsWith(` = ${total}`)).toBe(true);
    }
  }
});

it('repeats a seeded question and varies the visible givens with either input', () => {
  expect(makeRagQuestion(71)).toEqual(makeRagQuestion(71, 0));
  expect(makeRagQuestion(-8, 3)).toEqual(makeRagQuestion(-8, 3));
  const bySeed = Array.from({ length: 16 }, (_, seed) => makeRagQuestion(seed, 2).display);
  const byIndex = Array.from({ length: 16 }, (_, index) => makeRagQuestion(71, index).display);
  expect(new Set(bySeed).size).toBeGreaterThan(8);
  expect(new Set(byIndex).size).toBeGreaterThan(8);
});
