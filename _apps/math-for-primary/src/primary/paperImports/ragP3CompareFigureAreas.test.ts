import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP3CompareFigureAreas';

it('finds the only least area from the four labelled rows', () => {
  const winningLabels = new Set<string>();
  let sawEqualLargerAreas = false;

  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const table = q.picture;
      if (table?.type !== 'nanyang-p4' || table.layout !== 'table') {
        throw new Error('The card measurements must be visible in a table.');
      }
      expect(table.columns).toEqual(['Length (cm)', 'Breadth (cm)']);
      expect(table.rows).toHaveLength(4);
      const labels = table.rows.map(row => row.label);
      expect(new Set(labels).size).toBe(4);
      expect(q.choices).toEqual(labels);

      const areas = table.rows.map(({ label, values }) => {
        expect(values).toHaveLength(2);
        const [length, breadth] = values;
        if (length === null || breadth === null) throw new Error('Missing side length');
        expect(Number.isInteger(length) && Number.isInteger(breadth)).toBe(true);
        expect(breadth).toBeGreaterThan(0);
        expect(breadth).toBeLessThan(length);
        expect(breadth).toBeLessThanOrEqual(9);
        expect(length).toBeLessThanOrEqual(15);
        // Count unit squares one row at a time using only the displayed measurements.
        let count = 0;
        for (let row = 0; row < breadth; row++) count += length;
        expect(q.workedSteps).toEqual(expect.arrayContaining([
          expect.objectContaining({ equation: `${length} × ${breadth} = ${count} cm²` }),
        ]));
        return { label, count };
      });
      const min = Math.min(...areas.map(card => card.count));
      const winners = areas.filter(card => card.count === min);
      expect(winners).toHaveLength(1);
      expect(q.answer).toBe(winners[0].label);
      winningLabels.add(winners[0].label);
      sawEqualLargerAreas ||= new Set(areas.map(card => card.count)).size < 4;
    }
  }
  expect(winningLabels.size).toBe(4);
  expect(sawEqualLargerAreas).toBe(true);
});

it('repeats the same question and varies the visible measurements across indices', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  const pictures = Array.from({ length: 16 }, (_, index) => {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    return JSON.stringify(q.picture);
  });
  expect(new Set(pictures).size).toBeGreaterThan(1);
});
