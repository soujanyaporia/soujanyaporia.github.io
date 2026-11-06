import {expect, it} from 'vitest';
import type {Point} from './p3RafflesPicture';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragSelectWiderAngles';

function measure(a: Point, v: Point, b: Point) {
  const bearing = ([x, y]: Point) => Math.atan2(y - v[1], x - v[0]);
  const turn = Math.abs(bearing(a) - bearing(b));
  return Math.min(turn, 2 * Math.PI - turn) * 180 / Math.PI;
}

it('solves from the drawn sides and their letters across seeds and positions', () => {
  const modes = new Set<string>();
  const polygonCounts = new Set<number>();
  const singleWinners = new Set<string>();
  for (let seed = -3; seed <= 40; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const p = q.picture;
      if (p?.type === 'raffles-p3' && p.layout === 'angle-polygon') {
        const n = p.points.length;
        expect(n).toBe(5);
        expect(new Set(p.angles.map(a => a.vertex)).size).toBe(n);
        expect(new Set(p.angles.map(a => a.label)).size).toBe(n);
        const wide = p.angles.filter(({vertex}) => {
          const prev = p.points[(vertex + n - 1) % n];
          const v = p.points[vertex], next = p.points[(vertex + 1) % n];
          const turn = (v[0] - prev[0]) * (next[1] - v[1]) - (v[1] - prev[1]) * (next[0] - v[0]);
          expect(turn).toBeGreaterThan(0);
          return measure(prev, v, next) > 90 + 1e-7;
        }).map(a => a.label).sort();
        expect(q.answer).toBe(wide.join(''));
        expect(q.context?.join(' ')).toContain('ABC order');
        polygonCounts.add(wide.length);
        modes.add('polygon');
        continue;
      }

      if (p?.type !== 'batch11-upper') throw new Error('Missing angle diagram');
      const lines = p.marks.filter(m => m.kind === 'line');
      const labels = p.marks.filter(m => m.kind === 'text');
      expect(new Set(labels.map(m => m.text)).size).toBe(labels.length);
      expect(lines).toHaveLength(2 * labels.length);
      expect(p.marks.filter(m => m.kind === 'path')).toHaveLength(labels.length);
      // Match the visible letter beneath each opening to its nearest vertex.
      const readings = labels.map(label => {
        const distance = (x: number, y: number) => Math.hypot(label.x - x, label.y - y);
        const nearest = [...lines].sort((a, b) => distance(a.x1, a.y1) - distance(b.x1, b.y1))[0];
        const sides = lines.filter(l => l.x1 === nearest.x1 && l.y1 === nearest.y1);
        expect(sides).toHaveLength(2);
        const [a, b] = sides;
        return {label: label.text, vertex: [a.x1, a.y1].join(','), degrees: measure([a.x2, a.y2], [a.x1, a.y1], [b.x2, b.y2])};
      });
      expect(new Set(readings.map(r => r.vertex)).size).toBe(labels.length);
      expect(readings.filter(r => Math.abs(r.degrees - 90) < 1e-7)).toHaveLength(1);
      expect(readings.filter(r => r.degrees < 80)).toHaveLength(2);
      const wide = readings.filter(r => r.degrees > 90 + 1e-7).map(r => r.label).sort();
      const options = labels.map(m => m.text).sort();
      if (q.structuredResponse) {
        modes.add('pair');
        const spec = q.structuredResponse;
        if (spec.kind !== 'named-pair') throw new Error('Expected two letter selections');
        expect(options).toHaveLength(5);
        expect([...spec.options].sort()).toEqual(options);
        expect(wide).toHaveLength(2);
        expect(JSON.parse(q.answer).sort()).toEqual(wide);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...wide].reverse()))).toBe(true);
        for (const other of options.filter(label => !wide.includes(label))) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([wide[0], other]))).toBe(false);
        }
      } else {
        modes.add('single');
        expect(options).toHaveLength(4);
        expect([...(q.choices ?? [])].sort()).toEqual(options);
        expect(wide).toEqual([q.answer]);
        singleWinners.add(wide[0]);
      }
    }
  }
  expect([...modes].sort()).toEqual(['pair', 'polygon', 'single']);
  expect([...polygonCounts].sort()).toEqual([3, 4]);
  expect(singleWinners.size).toBe(4);
});

it('reproduces a diagram and answer for the same seed and index', () => {
  for (const seed of [0, 17, 1024]) {
    for (const index of [0, 1, 2, 9]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
