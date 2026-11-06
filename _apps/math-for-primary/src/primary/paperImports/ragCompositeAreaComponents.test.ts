import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Question} from '../generate';
import {Batch11UpperDiagram} from './Batch11UpperDiagram';
import {makeRagQuestion, RAG_PATTERN} from './ragCompositeAreaComponents';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'unit'>;
const visible = (q: Question): Visible => ({prompt: q.prompt, context: q.context, picture: q.picture, unit: q.unit});
const equalPoint = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
const distanceSquared = (a: Point, b: Point) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

// Independent polygon-area calculation: the generator adds component areas.
function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    twiceArea += a[0] * b[1] - a[1] * b[0];
  }
  return Math.abs(twiceArea) / 2;
}
function requiredNumber(text: string, expression: RegExp): number {
  const match = text.match(expression);
  if (!match) throw new Error(`Missing visible given: ${expression}`);
  return Number(match[1]);
}
function sideFromArea(area: number): number {
  // Recover a side from visible area, without generator parameters or square roots.
  for (let side = 1; side <= 12; side++) if (side * side === area) return side;
  throw new Error('Visible area is not a small perfect square');
}
function solveVisible(q: Visible): {kind: 'paired' | 'bridge'; area: number} {
  const text = (q.context ?? []).join(' ');
  if (q.unit !== 'cm²') throw new Error('Expected square centimetres');
  if (text.includes('square QRST')) {
    if (!text.includes('identical right-angled triangles') ||
        !text.includes('P, T and S lie on one straight line') ||
        !text.includes('Q, R and U lie on another straight line')) {
      throw new Error('Missing shared geometry');
    }
    const side = requiredNumber(text, /QT = (\d+) cm/);
    const base = requiredNumber(text, /PT = (\d+) cm/);
    if (!(base > 0 && base < side && side <= 12 && base * side % 2 === 0)) throw new Error('Unsuitable lengths');
    // Trace the outside boundary P-Q-U-S using only the stated lengths.
    return {kind: 'paired', area: polygonArea([[0, 0], [base, side], [2 * base + side, side], [base + side, 0]])};
  }
  if (!text.includes('whole bottom side of K') || !text.includes('whole left side of L') || !text.includes('right angle')) {
    throw new Error('Missing connecting-triangle constraints');
  }
  const a = sideFromArea(requiredNumber(text, /K has area (\d+) cm²/));
  const b = sideFromArea(requiredNumber(text, /L has area (\d+) cm²/));
  if (!(a > b && a * b % 2 === 0)) throw new Error('Unsuitable square sides');
  // Trace the union boundary, including the sloping edge of M.
  return {kind: 'bridge', area: polygonArea([[0, a], [a, a], [a, 0], [a + b, 0], [a + b, -b], [a, -b], [0, 0]])};
}

function pathPoints(d: string): Point[] {
  // Candidate polygons and right-angle marks use only M, L and optional Z.
  if (!/^[MLZ\s\d.\-]+$/.test(d)) throw new Error('Unexpected path command');
  const values = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (values.length % 2) throw new Error('Incomplete coordinate');
  return Array.from({length: values.length / 2}, (_, i): Point => [values[2 * i], values[2 * i + 1]]);
}
function isSquare(points: Point[]): boolean {
  if (points.length !== 4) return false;
  const length = distanceSquared(points[0], points[1]);
  return length > 0 && points.every((a, i) => {
    const b = points[(i + 1) % 4], c = points[(i + 2) % 4];
    return distanceSquared(a, b) === length && (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) === 0;
  });
}
function sharedEdges(a: Point[], b: Point[]): [Point, Point][] {
  return a.flatMap((p, i) => {
    const q = a[(i + 1) % a.length];
    const matches = b.some((u, j) => {
      const v = b[(j + 1) % b.length];
      return (equalPoint(p, u) && equalPoint(q, v)) || (equalPoint(p, v) && equalPoint(q, u));
    });
    return matches ? [[p, q] as [Point, Point]] : [];
  });
}
function checkJoinedWithoutOverlap(a: Point[], b: Point[]): void {
  const shared = sharedEdges(a, b);
  expect(shared).toHaveLength(1);
  const [p, q] = shared[0];
  const centre = (points: Point[]): Point => [
    points.reduce((sum, v) => sum + v[0], 0) / points.length,
    points.reduce((sum, v) => sum + v[1], 0) / points.length,
  ];
  const side = ([x, y]: Point) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  // These convex components must occupy opposite sides of their common edge.
  expect(side(centre(a)) * side(centre(b))).toBeLessThan(0);
}

describe('composite area from visible component relationships', () => {
  it('independently solves both variants across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const variations = new Set<string>();
    for (const seed of [-2147483648, -31, 0, 1, 5, 19, 257, 2147483647]) {
      for (let index = 0; index < 24; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        variations.add(JSON.stringify(q.context));
        expect(Number(q.answer)).toBe(solved.area);
        expect(Number.isInteger(solved.area)).toBe(true);
        expect(solved.area).toBeGreaterThan(0);
        expect(q.choices).toHaveLength(4);
        const choices = q.choices ?? [];
        expect(new Set(choices).size).toBe(4);
        expect(choices.filter(choice => Number(choice) === solved.area)).toHaveLength(1);
        expect(choices.every(choice => Number.isInteger(Number(choice)) && Number(choice) > 0)).toBe(true);
        expect(q.unit).toBe('cm²');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps).toHaveLength(4);
        expect(q.workedSteps?.every(step => step.text.length > 10 && !!step.equation)).toBe(true);
        expect(q.explanation).toContain(q.workedSteps?.[3].equation ?? 'missing');
        expect(q.context?.join(' ')).toContain('without overlapping');
        if (solved.kind === 'paired') {
          expect(q.context?.join(' ')).not.toMatch(/QT = 6 cm|PT = 3 cm/);
        } else {
          expect(q.context?.join(' ')).not.toMatch(/K has area 64 cm²|L has area 36 cm²/);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['bridge', 'paired']);
    expect(variations.size).toBeGreaterThan(20);
  });

  it('draws the required shared sides, separate components and right-angle marks using the existing renderer', () => {
    for (const seed of [-5, 0, 9, 123]) for (let index = 0; index < 2; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(visible(q));
      const model = q.picture;
      if (model?.type !== 'batch11-upper') throw new Error('Unsupported diagram');
      const closed: Point[][] = [];
      const markers: Point[][] = [];
      for (const mark of model.marks) {
        if (mark.kind === 'path') {
          const points = pathPoints(mark.d);
          for (const [x, y] of points) {
            expect(x).toBeGreaterThan(0); expect(x).toBeLessThan(320);
            expect(y).toBeGreaterThan(0); expect(y).toBeLessThan(200);
          }
          if (mark.d.trim().endsWith('Z')) closed.push(points);
          else markers.push(points);
        }
      }
      expect(closed).toHaveLength(3);
      expect(closed.every(points => polygonArea(points) > 0)).toBe(true);
      const squares = closed.filter(isSquare);
      const triangles = closed.filter(points => points.length === 3);
      const textLabels = model.marks.flatMap(mark => mark.kind === 'text' ? [mark.text] : []);
      if (solved.kind === 'paired') {
        expect(squares).toHaveLength(1); expect(triangles).toHaveLength(2);
        expect(markers).toHaveLength(2);
        for (const triangle of triangles) checkJoinedWithoutOverlap(squares[0], triangle);
        const lengths = (points: Point[]) => points.map((p, i) => distanceSquared(p, points[(i + 1) % points.length])).sort((a, b) => a - b);
        expect(lengths(triangles[0])).toEqual(lengths(triangles[1]));
        expect(textLabels).toEqual(expect.arrayContaining(['P', 'Q', 'R', 'S', 'T', 'U']));
        const text = (q.context ?? []).join(' ');
        expect(textLabels).toContain(`${requiredNumber(text, /QT = (\d+) cm/)} cm`);
        expect(textLabels).toContain(`${requiredNumber(text, /PT = (\d+) cm/)} cm`);
      } else {
        expect(squares).toHaveLength(2); expect(triangles).toHaveLength(1);
        expect(markers).toHaveLength(1);
        for (const square of squares) checkJoinedWithoutOverlap(square, triangles[0]);
        expect(sharedEdges(squares[0], squares[1])).toHaveLength(0);
        expect(squares[0].filter(p => squares[1].some(q => equalPoint(p, q)))).toHaveLength(1);
        expect(textLabels).toEqual(expect.arrayContaining(['K', 'L', 'M']));
      }
      for (const marker of markers) {
        expect(marker).toHaveLength(3);
        const [a, b, c] = marker;
        expect(Math.abs((a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]))).toBe(0);
        expect(distanceSquared(a, b)).toBe(distanceSquared(b, c));
        const vertex: Point = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]];
        expect(triangles.some(points => points.some(p => equalPoint(p, vertex)))).toBe(true);
      }
      const markup = renderToStaticMarkup(createElement(Batch11UpperDiagram, {model}));
      expect(markup).toContain('<svg');
      expect(markup).toContain('viewBox="0 0 320 200"');
      expect(markup).toContain('role="img"');
      expect(markup).not.toContain('<image');
      expect(q.context).toContain('The diagram is not drawn to scale.');
    }
  });

  it('has stable metadata and deterministic questions with both variants available', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-composite-area-from-components');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.AREA.01', 'P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03']);
    for (const seed of [-17, 0, 23, 999]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 7)).toEqual(makeRagQuestion(seed, 7));
      const first = makeRagQuestion(seed, 0), second = makeRagQuestion(seed, 1);
      expect(first.key).not.toBe(second.key);
      expect(solveVisible(visible(first)).kind).not.toBe(solveVisible(visible(second)).kind);
    }
  });
});
