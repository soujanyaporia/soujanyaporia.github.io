import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP3ShadedGridArea';

type Point = [number, number];

// Measure the polygons that the pupil sees, independently of the generator's counts.
function polygonArea(points: Point[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i], [u, v] = points[(i + 1) % points.length];
    twice += x * v - y * u;
  }
  return Math.abs(twice) / 2;
}

it('recovers the shaded area from the drawn polygons and printed cell side', () => {
  const sides = new Set<number>(), outlines = new Set<string>();
  for (let seed = -8; seed < 24; seed++) for (let index = 0; index < 4; index++) {
    const q = makeRagQuestion(seed, index), p = q.picture;
    if (p?.type !== 'batch9-early' || p.layout !== 'area-fraction') throw Error('Missing shaded grid');
    const match = /sides of (\d+) cm\b/.exec(q.context?.join(' ') ?? '');
    if (!match) throw Error('Missing cell side length');
    const side = Number(match[1]);
    sides.add(side);
    const square = p.pieces.find(piece => piece.points.length === 4);
    if (!square) throw Error('No whole grid square for scale');
    const cellArea = polygonArea(square.points);
    expect(cellArea).toBeGreaterThan(0);
    const shaded = p.pieces.filter(piece => piece.shaded);
    const measured = shaded.reduce((sum, piece) => sum + polygonArea(piece.points), 0);
    const expected = measured / cellArea * side * side;
    expect(q.answer).toBe(String(expected));
    expect(q.unit).toBe('cm²');
    expect(q.choices).toBeUndefined();
    expect(q.structuredResponse).toBeUndefined();
    expect(shaded.some(piece => polygonArea(piece.points) === cellArea)).toBe(true);
    const halfCount = shaded.filter(piece => polygonArea(piece.points) === cellArea / 2).length;
    expect(halfCount).toBeGreaterThanOrEqual(2);
    expect(halfCount % 2).toBe(0);
    outlines.add(JSON.stringify(shaded.map(piece => piece.points)));
  }
  expect([...sides].sort()).toEqual([1, 2, 3]);
  expect(outlines.size).toBeGreaterThan(8);
});

it('tiles the board without missing cells or overlapping halves', () => {
  for (let seed = 0; seed < 40; seed++) {
    const q = makeRagQuestion(seed, 1), p = q.picture;
    expect(makeRagQuestion(seed, 1)).toEqual(q);
    if (p?.type !== 'batch9-early' || p.layout !== 'area-fraction') throw Error('Missing shaded grid');
    const cells = new Map<string, typeof p.pieces>();
    const columns = new Set<number>(), rows = new Set<number>();
    for (const piece of p.pieces) {
      const x = Math.min(...piece.points.map(v => v[0])), y = Math.min(...piece.points.map(v => v[1]));
      columns.add(x); rows.add(y);
      for (const [u, v] of piece.points) {
        expect([0, 1]).toContain(u - x); expect([0, 1]).toContain(v - y);
      }
      const k = `${x}:${y}`;
      cells.set(k, [...(cells.get(k) ?? []), piece]);
    }
    expect(cells.size).toBe(columns.size * rows.size);
    expect(Math.max(...columns) - Math.min(...columns) + 1).toBe(columns.size);
    expect(Math.max(...rows) - Math.min(...rows) + 1).toBe(rows.size);
    for (const parts of cells.values()) {
      if (parts.length === 1) {
        expect(polygonArea(parts[0].points)).toBe(1);
      } else {
        expect(parts).toHaveLength(2);
        const [a, b] = parts;
        expect(polygonArea(a.points)).toBe(0.5); expect(polygonArea(b.points)).toBe(0.5);
        expect(a.shaded).not.toBe(b.shaded);
        const common = a.points.filter(([x, y]) => b.points.some(([u, v]) => x === u && y === v));
        expect(common).toHaveLength(2);
        expect(Math.abs(common[0][0] - common[1][0])).toBe(1);
        expect(Math.abs(common[0][1] - common[1][1])).toBe(1);
      }
    }
  }
});
