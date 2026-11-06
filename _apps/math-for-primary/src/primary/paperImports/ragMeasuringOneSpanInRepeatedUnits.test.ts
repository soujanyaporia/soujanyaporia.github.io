import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragMeasuringOneSpanInRepeatedUnits';

// Read only the diagram. Count spaces from the starting edge to the edge nearest
// the string tip. Neither a labelled end value nor the whole row is the length.
function readDiagram(p: Question['picture']) {
  if (p?.type !== 'grid-drawing') throw new Error('Missing string diagram');
  const frame = p.givenSegments ?? [];
  const edges = frame.filter(([a, b]) => a[0] === b[0] && a[1] !== b[1])
    .map(([a]) => a[0]).sort((a, b) => a - b);
  const width = edges[1] - edges[0];
  expect(width).toBeGreaterThan(0);
  expect(edges.slice(1).every((x, i) => x - edges[i] === width)).toBe(true);
  const rails = frame.filter(([a, b]) => a[1] === b[1]);
  expect(rails).toHaveLength(2);
  for (const [a, b] of rails) expect([a[0], b[0]]).toEqual([edges[0], edges[edges.length - 1]]);
  const top = Math.min(...rails.map(([a]) => a[1]));
  const bottom = Math.max(...rails.map(([a]) => a[1]));
  expect(top).toBeLessThan(bottom);

  return [...p.segments].sort(([a], [b]) => a[1] - b[1]).map(([a, b]) => {
    expect(a[1]).toBe(b[1]);
    expect(a[1] < top || a[1] > bottom).toBe(true);
    const left = Math.min(a[0], b[0]), right = Math.max(a[0], b[0]);
    const start = edges.indexOf(left);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThan(left);
    expect(right).toBeLessThan(edges[edges.length - 1]);
    const distances = edges.map(x => Math.abs(x - right));
    const best = Math.min(...distances);
    expect(best).toBeGreaterThan(0);
    expect(best).toBeLessThan(width / 2);
    expect(distances.filter(d => d === best)).toHaveLength(1);
    const finish = distances.indexOf(best);
    return { units: finish - start, direction: edges[finish] < right ? 'down' : 'up', start };
  });
}

it('answers from the visible tile edges in every response format', () => {
  const forms = new Set<string>(), directions = new Set<string>(), sizes = new Set<number>();
  let sawOffset = false;
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const readings = readDiagram(q.picture);
      const values = readings.map(({units, direction, start}) => {
        sizes.add(units); directions.add(direction); sawOffset ||= start > 0;
        expect(units).toBeGreaterThan(0);
        expect(units).toBeLessThanOrEqual(10);
        return String(units);
      });
      if (q.structuredResponse) {
        forms.add('pair');
        expect(values).toHaveLength(2);
        expect(new Set(values).size).toBe(2);
        expect(q.structuredResponse).toEqual({kind: 'number-pair', firstLabel: 'Top string (cm)', secondLabel: 'Bottom string (cm)'});
        expect(q.answer).toBe(JSON.stringify(values));
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([...values].reverse()))).toBe(false);
      } else {
        expect(values).toHaveLength(1);
        expect(q.unit).toBe('cm');
        expect(q.answer).toBe(values[0]);
        forms.add(q.choices ? 'choice' : 'blank');
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(values[0]);
        }
      }
    }
  }
  expect(forms.size).toBe(3);
  expect(directions).toEqual(new Set(['up', 'down']));
  expect(sawOffset).toBe(true);
  expect(sizes.size).toBeGreaterThanOrEqual(5);
});

it('reproduces a question from its seed and index', () => {
  expect(makeRagQuestion(37, 5)).toEqual(makeRagQuestion(37, 5));
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
});
