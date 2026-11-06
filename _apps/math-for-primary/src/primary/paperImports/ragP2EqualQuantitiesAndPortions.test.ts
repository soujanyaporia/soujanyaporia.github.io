import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2EqualQuantitiesAndPortions';

it('solves each level balance from its printed labels and grades exactly one kilogram choice', () => {
  const counts = new Set<number>();
  const sackSides = new Set<string>();
  const totals = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const diagram = q.picture;
      if (diagram?.type !== 'paper' || diagram.layout !== 'bars') throw Error('Missing pan diagram');
      expect(q.context?.join(' ')).toContain('The two pans balance');
      expect(diagram.rows.map(row => row.label)).toEqual(['Left pan', 'Right pan']);
      const legend = /^Each ◆ stands for a (\d+) g weight\.$/.exec(diagram.caption ?? '');
      const request = /^How much do (\d+) rice sacks weigh altogether\?$/.exec(q.prompt);
      if (!legend || !request) throw Error('The weight label or requested sack count is missing');
      const commonGrams = Number(legend[1]);
      const count = Number(request[1]);
      expect(commonGrams).toBeGreaterThan(0);
      expect(commonGrams).toBeLessThan(1000);
      expect([2, 3, 4, 5]).toContain(count);
      counts.add(count);

      const pans = diagram.rows.map(row => {
        expect(row.parts.filter(part => part.label === '◆')).toHaveLength(1);
        const masses = row.parts.map(({ label }) => {
          if (label === '1 sack') return null;
          if (label === '◆') return commonGrams;
          const weight = /^(\d+) kg$/.exec(label);
          if (!weight) throw Error(`Unreadable weight: ${label}`);
          return Number(weight[1]) * 1000;
        });
        return { row, masses, known: masses.reduce<number>((sum, mass) => sum + (mass ?? 0), 0) };
      });
      const loaded = pans.find(pan => pan.masses.includes(null));
      const other = pans.find(pan => !pan.masses.includes(null));
      if (!loaded || !other) throw Error('Expected one pan with a sack and one with weights only');
      expect(loaded.masses.filter(mass => mass === null)).toHaveLength(1);
      expect(loaded.row.parts.some(part => part.label.endsWith(' kg'))).toBe(true);
      expect(other.row.parts.filter(part => part.label.endsWith(' kg')).length).toBeGreaterThan(1);
      sackSides.add(loaded.row.label);

      const oneSackGrams = other.known - loaded.known;
      expect(oneSackGrams).toBeGreaterThan(0);
      expect(oneSackGrams % 1000).toBe(0);
      const totalKg = count * oneSackGrams / 1000;
      totals.add(totalKg);
      const expected = `${totalKg} kg`;
      expect(q.answer).toBe(expected);
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      for (const choice of choices) expect(choice).toMatch(/^[1-9]\d* kg$/);
      expect(choices.filter(choice => correctAnswer(q, choice))).toEqual([expected]);

      // Check the drawn lengths only after solving from labels.
      for (const pan of pans) {
        pan.row.parts.forEach((part, i) => expect(part.size).toBe(pan.masses[i] ?? oneSackGrams));
        expect(pan.row.parts.reduce((sum, part) => sum + part.size, 0)).toBe(other.known);
      }
    }
  }
  expect(counts.size).toBe(4);
  expect(sackSides.size).toBe(2);
  expect(totals.size).toBeGreaterThan(8);
});

it('reproduces the same question and uses zero as the default index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(-5, 7)).toEqual(makeRagQuestion(-5, 7));
});
