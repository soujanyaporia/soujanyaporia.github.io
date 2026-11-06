import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragCountRightAngles';
import type { GridPoint as Point } from '../gridDrawingModel';

// Walk the drawn edges and measure the change in heading at each corner.
// A quarter turn counts only in the winding direction of the outline.
function readCorners(p: Point[]): number[] {
  expect(new Set(p.map(v => v.join(','))).size).toBe(p.length);
  const heading = p.map(([x, y], i) => {
    const [a, b] = p[(i + 1) % p.length];
    return Math.atan2(b - y, a - x);
  });
  const turns = heading.map((h, i) => {
    const delta = h - heading[(i + p.length - 1) % p.length];
    return Math.atan2(Math.sin(delta), Math.cos(delta));
  });
  const sum = turns.reduce((a, b) => a + b, 0);
  expect(Math.abs(sum)).toBeCloseTo(2 * Math.PI);
  return turns.flatMap((t, i) => Math.abs(t - Math.sign(sum) * Math.PI / 2) < 1e-8 ? [i] : []);
}

const distance = (p: Point, q: Point) => Math.hypot(p[0] - q[0], p[1] - q[1]);
function partOfSide(p: Point, a: Point, b: Point) {
  return distance(a, p) > 1e-7 && distance(p, b) > 1e-7 &&
    Math.abs(distance(a, p) + distance(p, b) - distance(a, b)) < 1e-7;
}

test('solve each response from its outlines and check the inside square marks', () => {
  const seen = new Set<string>(), totals = new Set<number>(), loneLabels = new Set<string>(), pairLabels = new Set<string>();
  for (let seed = -4; seed < 32; seed++) for (let index = 0; index < 7; index++) {
    const q = makeRagQuestion(seed, index), pic = q.picture;
    let expected: string;
    if (pic?.type === 'grid-drawing') {
      seen.add('count');
      expect(q.prompt).toMatch(/how many/i);
      const edges = pic.givenSegments!;
      const p = edges.map(([a]) => a);
      edges.forEach(([, b], i) => expect(b).toEqual(p[(i + 1) % p.length]));
      const ids = readCorners(p);
      expected = String(ids.length);
      totals.add(ids.length);
      const marked: number[] = [];
      expect(pic.segments.length).toBe(2 * ids.length);
      for (let j = 0; j < pic.segments.length; j += 2) {
        const [u, elbow] = pic.segments[j], [joint, v] = pic.segments[j + 1];
        expect(joint).toEqual(elbow);
        const i = p.findIndex((c, k) => partOfSide(u, p[(k + p.length - 1) % p.length], c) &&
          partOfSide(v, c, p[(k + 1) % p.length]));
        expect(i).toBeGreaterThanOrEqual(0);
        expect(distance(u, p[i])).toBeCloseTo(distance(v, p[i]));
        expect(elbow[0]).toBeCloseTo(u[0] + v[0] - p[i][0]);
        expect(elbow[1]).toBeCloseTo(u[1] + v[1] - p[i][1]);
        marked.push(i);
      }
      expect(marked.sort((a, b) => a - b)).toEqual(ids);
      expect(q.choices?.every(s => /^\d+$/.test(s))).toBe(true);
    } else if (pic?.type === 'raffles-p3' && pic.layout === 'polygons') {
      const shapes = pic.shapes;
      expect(new Set(shapes.map(s => s.label)).size).toBe(4);
      const ns = shapes.map(s => readCorners(s.points).length);
      if (/no right angles/i.test(q.prompt)) {
        seen.add('zero');
        const match = shapes.filter((_, i) => ns[i] === 0);
        expect(match).toHaveLength(1);
        expected = match[0].label;
        loneLabels.add(expected);
        expect(q.choices).toBeUndefined();
      } else {
        seen.add('pair');
        expect(q.prompt).toMatch(/same number of right angles/i);
        const all = shapes.flatMap((a, i) => shapes.slice(i + 1).map((b, j) => ({
          text: `${a.label} and ${b.label}`, matches: ns[i] === ns[i + j + 1],
        })));
        const matches = all.filter(p => p.matches);
        expect(matches).toHaveLength(1);
        expected = matches[0].text;
        pairLabels.add(expected);
        expect(q.choices?.every(c => all.some(p => p.text === c))).toBe(true);
      }
    } else throw new Error('A visible polygon diagram is required.');
    if (q.choices) {
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(expected);
    }
    expect(q.answer).toBe(expected);
  }
  expect(seen.size).toBe(3);
  expect(totals.size).toBeGreaterThanOrEqual(3);
  expect(loneLabels.size).toBeGreaterThan(1);
  expect(pairLabels.size).toBeGreaterThan(1);
});

test('the same seed and index reproduce the same visible question', () => {
  for (const seed of [-91, 0, 422]) for (let index = 0; index < 7; index++) {
    expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
  }
});
