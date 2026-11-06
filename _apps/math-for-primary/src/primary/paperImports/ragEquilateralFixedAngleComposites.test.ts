import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragEquilateralFixedAngleComposites';

type Point = [number, number];
type Points = Record<string, Point>;
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function angle(a: Point, vertex: Point, c: Point): number {
  const u = [a[0] - vertex[0], a[1] - vertex[1]];
  const v = [c[0] - vertex[0], c[1] - vertex[1]];
  const cosine = (u[0] * v[0] + u[1] * v[1]) / Math.hypot(...u) / Math.hypot(...v);
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
// Independent line-equation solver; no production geometry helper is imported.
function intersection(a: Point, b: Point, c: Point, d: Point): Point {
  const A = a[1] - b[1], B = b[0] - a[0], C = A * a[0] + B * a[1];
  const D = c[1] - d[1], E = d[0] - c[0], F = D * c[0] + E * c[1];
  const determinant = A * E - D * B;
  if (Math.abs(determinant) < 1e-9) throw new Error('Underdetermined intersection');
  return [(C * E - F * B) / determinant, (A * F - D * C) / determinant];
}
const targetNames = (prompt: string) => [...prompt.matchAll(/angle ([A-Z]{3})/g)].map(m => m[1]);
function triangleNames(text: string): string[] {
  const one = /Triangle ([A-Z]{3}) is equilateral/.exec(text);
  const two = /Triangles ([A-Z]{3}) and ([A-Z]{3}) are equilateral/.exec(text);
  return one ? [one[1]] : two ? [two[1], two[2]] : [];
}

// This solver accepts only pupil-visible prose, never the stored answer,
// worked solution, seed, variant index or production construction parameters.
function solveVisible(q: Pick<Question, 'context' | 'prompt'>): number[] {
  const text = q.context?.join(' ') ?? '';
  const points: Points = {};
  const square = /([A-Z]{4}) is a square/.exec(text);
  if (square) {
    const corners: Point[] = [[0, 1], [1, 1], [1, 0], [0, 0]];
    [...square[1]].forEach((name, i) => {points[name] = corners[i];});
    const triangles = triangleNames(text);
    if (triangles.length !== 1) throw new Error('Missing equilateral triangle');
    const vertices = [...triangles[0]];
    const known = vertices.filter(name => points[name]);
    const missing = vertices.filter(name => !points[name]);
    if (known.length !== 2 || missing.length !== 1 || !text.includes('inside the square')) throw new Error('Missing position information');
    const a = points[known[0]], b = points[known[1]];
    const midpoint: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    // The third vertex must be equally far from both base ends, with all sides equal.
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const candidates: Point[] = [1, -1].map(sign => [
      midpoint[0] - sign * Math.sqrt(3) * dy / 2,
      midpoint[1] + sign * Math.sqrt(3) * dx / 2,
    ]);
    const inside = candidates.filter(p => p[0] > 0 && p[0] < 1 && p[1] > 0 && p[1] < 1);
    if (inside.length !== 1) throw new Error('Ambiguous equilateral position');
    points[missing[0]] = inside[0];
  } else {
    if (!text.includes('Triangles ABC and DEF are equilateral.')) throw new Error('Missing triangle givens');
    if (!text.includes('G, B, E and H lie on one straight line in that order.')) throw new Error('Missing baseline order');
    const givens = new Map([...text.matchAll(/Angle ([A-Z]{3}) = (\d+)°/g)].map(m => [m[1], Number(m[2])]));
    const alpha = givens.get('ABG'), beta = givens.get('FEH');
    if (alpha === undefined || beta === undefined) throw new Error('Missing exterior angles');
    points.G = [-1, 0]; points.B = [0, 0]; points.E = [1, 0]; points.H = [3, 0];
    const place = (origin: Point, radius: number, degrees: number): Point => [
      origin[0] + radius * Math.cos(degrees * Math.PI / 180),
      origin[1] + radius * Math.sin(degrees * Math.PI / 180),
    ];
    const equilateralAngle = 180 / 3;
    // Different arbitrary side lengths from the production drawing: lengths are not givens.
    points.A = place(points.B, 1.4, 180 - alpha);
    points.C = place(points.B, 1.4, 180 - alpha - equilateralAngle);
    points.F = place(points.E, 1.8, beta);
    points.D = place(points.E, 1.8, beta + equilateralAngle);
  }
  const joins = [...text.matchAll(/Lines ([A-Z]{2}) and ([A-Z]{2}) meet at ([A-Z])\./g)];
  if (!joins.length) throw new Error('Missing intersections');
  for (const m of joins) points[m[3]] = intersection(points[m[1][0]], points[m[1][1]], points[m[2][0]], points[m[2][1]]);
  const targets = targetNames(q.prompt);
  if (!targets.length) throw new Error('Missing requested angles');
  return targets.map(name => angle(points[name[0]], points[name[1]], points[name[2]]));
}

// Read the actual visible vertex dots and their nearby letter labels.
function readDrawing(q: Question): Points {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const dots: Point[] = q.picture.marks.flatMap(m => m.kind === 'circle' ? [[m.cx, m.cy] as Point] : []);
  const points: Points = {};
  for (const mark of q.picture.marks) {
    if (mark.kind !== 'text' || !/^[A-Z]$/.test(mark.text)) continue;
    const label: Point = [mark.x, mark.y];
    const nearest = [...dots].sort((a, b) => distance(a, label) - distance(b, label))[0];
    if (!nearest || distance(nearest, label) > 32) throw new Error('Unclear point label');
    points[mark.text] = nearest;
  }
  expect(new Set(Object.values(points).map(p => p.join(','))).size).toBe(Object.keys(points).length);
  return points;
}
function checkOrder(points: Points, names: string[]): void {
  const a = points[names[0]], b = points[names[names.length - 1]];
  const length = distance(a, b);
  let previous = -1;
  for (const name of names) {
    const p = points[name];
    expect(distance(a, p) + distance(p, b)).toBeCloseTo(length, 7);
    const position = distance(a, p) / length;
    expect(position).toBeGreaterThan(previous);
    previous = position;
  }
}

const seeds = [-2147483648, -9, 0, 1, 2, 17, 99, 2147483647, ...Array.from({length: 64}, (_, i) => i * 7919 + 23)];

describe('equilateral fixed-angle composites', () => {
  it('independently solves every requested part from visible givens across seeds', () => {
    const layouts = new Set<string>();
    const exteriorPairs = new Set<string>();
    for (const seed of seeds) for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible({context: q.context, prompt: q.prompt});
      solved.forEach(n => {
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThan(180);
        expect(n).toBeCloseTo(Math.round(n), 8);
      });
      const expected = solved.map(n => String(Math.round(n)));
      expect(q.answer).toBe(expected.length === 1 ? expected[0] : JSON.stringify(expected));
      expect(q.unit).toBe('degrees');
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
      expect(q.hint.length).toBeGreaterThan(20);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      layouts.add(q.prompt);
      const exterior = q.context?.find(t => t.startsWith('Angle ABG'));
      if (exterior) {
        exteriorPairs.add(exterior);
        const values = [...exterior.matchAll(/= (\d+)°/g)].map(m => Number(m[1]));
        expect(values[0]).toBeGreaterThanOrEqual(96);
        expect(values[0]).toBeLessThanOrEqual(102);
        expect(values[1]).toBeGreaterThanOrEqual(52);
        expect(values[1]).toBeLessThanOrEqual(58);
        expect(values[0] % 2).toBe(0);
        expect(values[1] % 2).toBe(0);
      }
    }
    expect(layouts.size).toBe(3);
    expect(exteriorPairs.size).toBe(16);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('equilateral-fixed-angle-composites');
  });

  it('draws equilateral triangles, square corners and intersections consistent with the prose', () => {
    for (const seed of seeds) for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const text = q.context!.join(' '), points = readDrawing(q);
      for (const name of triangleNames(text)) {
        const [a, b, c] = [...name].map(letter => points[letter]);
        expect(distance(a, b)).toBeCloseTo(distance(b, c), 7);
        expect(distance(a, b)).toBeCloseTo(distance(c, a), 7);
      }
      const square = /([A-Z]{4}) is a square/.exec(text);
      if (square) {
        const corners = [...square[1]].map(letter => points[letter]);
        for (let i = 0; i < 4; i++) {
          expect(distance(corners[i], corners[(i + 1) % 4])).toBeCloseTo(distance(corners[0], corners[1]), 7);
          expect(angle(corners[(i + 3) % 4], corners[i], corners[(i + 1) % 4])).toBeCloseTo(90, 7);
        }
      }
      for (const m of text.matchAll(/([A-Z]) is between ([A-Z]) and ([A-Z])/g)) checkOrder(points, [m[2], m[1], m[3]]);
      for (const m of text.matchAll(/([A-Z]), ([A-Z]), ([A-Z]) and ([A-Z]) lie on one straight line in that order/g)) checkOrder(points, m.slice(1));
      for (const m of text.matchAll(/Lines ([A-Z]{2}) and ([A-Z]{2}) meet at ([A-Z])\./g)) {
        const computed = intersection(points[m[1][0]], points[m[1][1]], points[m[2][0]], points[m[2][1]]);
        expect(distance(computed, points[m[3]])).toBeCloseTo(0, 7);
      }
      for (const m of text.matchAll(/Angle ([A-Z]{3}) = (\d+)°/g)) {
        expect(angle(points[m[1][0]], points[m[1][1]], points[m[1][2]])).toBeCloseTo(Number(m[2]), 7);
      }
      const expected = solveVisible({context: q.context, prompt: q.prompt});
      targetNames(q.prompt).forEach((name, i) => {
        expect(angle(points[name[0]], points[name[1]], points[name[2]])).toBeCloseTo(expected[i], 7);
      });
      if (q.picture?.type !== 'batch11-upper') throw new Error('Missing diagram');
      for (const mark of q.picture.marks) {
        const coordinates: Point[] = mark.kind === 'text' ? [[mark.x, mark.y]]
          : mark.kind === 'circle' ? [[mark.cx, mark.cy]]
          : mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]] : [];
        for (const [x, y] of coordinates) {
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(300);
          expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(200);
        }
      }
    }
  });

  it('keeps linked answers ordered and rejects missing, swapped and incorrect parts', () => {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(42, index);
      const expected = solveVisible({context: q.context, prompt: q.prompt}).map(n => String(Math.round(n)));
      if (expected.length === 1) {
        expect(q.structuredResponse).toBeUndefined();
        continue;
      }
      const response = q.structuredResponse;
      if (!response || response.kind !== 'number-pair') throw new Error('Missing paired response');
      const targets = targetNames(q.prompt);
      expect(response.firstLabel).toContain(targets[0]);
      expect(response.secondLabel).toContain(targets[1]);
      expect(structuredResponseCorrect(response, q.answer, JSON.stringify(expected))).toBe(true);
      expect(structuredResponseCorrect(response, q.answer, JSON.stringify([...expected].reverse()))).toBe(false);
      expect(structuredResponseCorrect(response, q.answer, JSON.stringify([expected[0]]))).toBe(false);
      expect(structuredResponseCorrect(response, q.answer, JSON.stringify([expected[0], String(Number(expected[1]) + 1)]))).toBe(false);
    }
  });
});
