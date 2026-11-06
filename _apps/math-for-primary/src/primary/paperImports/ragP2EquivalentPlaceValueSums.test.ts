import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2EquivalentPlaceValueSums';

function expressionValue(label: string): number {
  const sum = /^(\d+) \+ (\d+)$/.exec(label);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const units = /^(\d+) hundreds?, (\d+) tens? and (\d+) ones?$/.exec(label);
  if (units) return Number(units[1]) * 100 + Number(units[2]) * 10 + Number(units[3]);
  throw new Error(`Cannot read choice ${label}`);
}

it('finds the unique choice from the displayed whole, equation and options', () => {
  const forms = new Set<string>();
  const targets = new Set<number>();
  const answerPositions = new Set<number>();
  for (let seed = -12; seed < 36; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const display = q.display ?? '';
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const gap = /^(\d+) \+ □ \+ (\d+) = (\d+)$/.exec(display);
      const target = gap ? Number(gap[3]) : Number(display);
      expect(target).toBeGreaterThanOrEqual(100);
      expect(target).toBeLessThan(1000);
      targets.add(target);

      let matches: string[];
      if (gap) {
        forms.add('missing tens');
        const hundreds = Number(gap[1]);
        const ones = Number(gap[2]);
        expect(hundreds).toBe(Math.floor(target / 100) * 100);
        expect(ones).toBe(target % 10);
        for (const label of choices) expect(label).toMatch(/^\d+$/);
        matches = choices.filter(label => hundreds + Number(label) + ones === target);
      } else {
        expect(display).toMatch(/^[1-9]\d{2}$/);
        const values = choices.map(expressionValue);
        expect(new Set(values).size).toBe(4);
        for (const value of values) expect(value).toBeLessThanOrEqual(1000);
        matches = choices.filter((_, position) => values[position] === target);
        if (choices[0].includes('+')) {
          forms.add('expanded sum');
          expect(Math.floor(target / 10) % 10).toBe(0);
          expect(matches).toEqual([`${target - target % 10} + ${target % 10}`]);
        } else {
          forms.add('regrouped units');
          const counts = matches[0]?.match(/\d+/g)?.map(Number) ?? [];
          expect(counts).toHaveLength(3);
          expect(counts[1]).toBeGreaterThanOrEqual(10);
          expect(counts[2]).toBeGreaterThanOrEqual(10);
        }
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      answerPositions.add(choices.indexOf(matches[0]));

      const check = /^(\d+(?: \+ \d+)+) = (\d+)$/.exec(q.workedSteps?.at(-1)?.equation ?? '');
      if (!check) throw new Error('Expected a final addition check');
      expect(check[1].split(' + ').reduce((sum, term) => sum + Number(term), 0)).toBe(target);
      expect(Number(check[2])).toBe(target);
    }
  }
  expect(forms.size).toBe(3);
  expect(targets.size).toBeGreaterThan(10);
  expect(answerPositions.size).toBe(4);
});

it('reproduces the same visible question and choice order for a saved seed and index', () => {
  for (const index of [0, 1, 2]) {
    expect(makeRagQuestion(23, index)).toEqual(makeRagQuestion(23, index));
  }
  expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
});
