import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragOrderMeasurementsAcrossUnits';

// Use centimetres, grams and millilitres to solve directly from the pupil's readings.
const scales: Record<string, number> = { km: 100000, m: 100, cm: 1, kg: 1000, g: 1, L: 1000, ml: 1 };
const nextUnit: Record<string, string> = { km: 'm', m: 'cm', kg: 'g', L: 'ml' };

function readMeasurement(text: string) {
  const match = /^(\d+) (km|cm|m|kg|g|L|ml)(?: (\d+) (km|cm|m|kg|g|L|ml))?$/.exec(text);
  if (!match) throw new Error(`Unreadable measurement: ${text}`);
  const [, count, unit, remainder, smaller] = match;
  let value = Number(count) * scales[unit];
  expect(value).toBeGreaterThan(0);
  if (smaller) {
    expect(smaller).toBe(nextUnit[unit]);
    const extra = Number(remainder) * scales[smaller];
    expect(extra).toBeGreaterThan(0);
    expect(extra).toBeLessThan(scales[unit]);
    value += extra;
  }
  return { value, unit, compound: Boolean(smaller) };
}

function visibleRows(q: Question) {
  if (q.context?.length) return q.context.map(line => {
    const parts = line.split(' — ');
    expect(parts).toHaveLength(2);
    const [label, text] = parts;
    return { label, text, ...readMeasurement(text) };
  });
  if (!q.order) throw new Error('Missing measurement cards');
  return q.order.map(text => ({ label: text, text, ...readMeasurement(text) }));
}

it('solves the four visible readings and checks the response requested by the prompt', () => {
  const covered = new Set<string>();
  for (const seed of [-27, -1, 0, 5, 28, 107, 812, 4031]) {
    for (let index = 0; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = visibleRows(q);
      expect(rows).toHaveLength(4);
      expect(new Set(rows.map(row => row.label)).size).toBe(4);
      expect(new Set(rows.map(row => row.value)).size).toBe(4);
      expect(rows.some(row => row.compound)).toBe(true);
      const units = rows.map(row => row.unit);
      const common = units.includes('km') ? 'm' : units.includes('kg') ? 'g' : units.includes('L') ? 'ml' : 'cm';
      const allowed: Record<string, string[]> = { m: ['km', 'm', 'cm'], cm: ['m', 'cm'], g: ['kg', 'g'], ml: ['L', 'ml'] };
      for (const row of rows) {
        expect(allowed[common]).toContain(row.unit);
        const value = row.value / scales[common];
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeLessThanOrEqual(10000);
        if (row.text !== `${value} ${common}`) {
          expect(q.workedSteps?.map(step => step.equation)).toContain(`${row.text} = ${value} ${common}`);
        }
      }
      const ranked = [...rows].sort((a, b) => a.value - b.value);
      const labels = rows.map(row => row.label).sort();
      if (q.prompt.startsWith('Put ')) {
        expect(q.prompt).toMatch(/lightest|least|shortest/);
        expect([...(q.order ?? [])].sort()).toEqual(labels);
        expect(q.choices).toBeUndefined();
        const expected = ranked.map(row => row.label).join(',');
        expect(q.answer).toBe(expected);
        expect(q.order?.join(',')).not.toBe(expected);
        if (common === 'ml') expect(q.order).toEqual(rows.map(row => row.text));
        covered.add(`${common}-ascending`);
      } else {
        expect(q.prompt).toMatch(/heaviest|most|farthest|lightest|least|shortest/);
        const smallest = /lightest|least|shortest/.test(q.prompt);
        expect(q.order).toBeUndefined();
        expect([...(q.choices ?? [])].sort()).toEqual(labels);
        expect(q.answer).toBe(ranked[smallest ? 0 : 3].label);
        if (common === 'm' && !smallest) expect(new Set(units)).toEqual(new Set(['cm', 'm', 'km']));
        covered.add(`${common}-${smallest ? 'smallest' : 'greatest'}`);
      }
    }
  }
  expect(covered.size).toBe(12);
});

it('replays a seed and index exactly while varying the visible measurements across seeds', () => {
  const signatures = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    const q = makeRagQuestion(seed, 4);
    expect(makeRagQuestion(seed, 4)).toEqual(q);
    signatures.add(visibleRows(q).map(row => row.text).sort().join('|'));
  }
  expect(signatures.size).toBeGreaterThan(12);
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
});
