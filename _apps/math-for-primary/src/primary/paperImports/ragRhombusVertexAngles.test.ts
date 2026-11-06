import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragRhombusVertexAngles';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context'>;
const rad = (a: number) => a * Math.PI / 180;
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const times = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
const distance = (a: Point, b: Point) => Math.hypot(...sub(a, b));
const interpolate = (a: Point, b: Point, t: number) => add(a, times(sub(b, a), t));
function angle(a: Point, vertex: Point, b: Point): number {
  const u = sub(a, vertex), v = sub(b, vertex);
  return Math.atan2(Math.abs(cross(u, v)), dot(u, v)) * 180 / Math.PI;
}
function given(q: Visible, name: string): number {
  const match = new RegExp(`Angle ${name} is (\\d+)°`).exec((q.context ?? []).join(' '));
  if (!match) throw new Error(`Missing visible angle ${name}`);
  return Number(match[1]);
}
function intersect(p: Point, direction: Point, q: Point, otherDirection: Point): Point {
  const divisor = cross(direction, otherDirection);
  if (Math.abs(divisor) < 1e-10) throw new Error('Parallel lines cannot supply this intersection');
  return add(p, times(direction, cross(sub(q, p), otherDirection) / divisor));
}

// Reconstruct unit geometry from the visible statements, independently of the
// generator's arithmetic and its diagram coordinates. This function cannot read
// answers, worked steps, keys, seeds or hidden generation parameters.
function solveVisible(q: Visible): number[] {
  if (q.prompt.includes('(a)')) {
    const a = given(q, 'BAD'), e = given(q, 'EBC');
    const A: Point = [0, 0], D: Point = [1, 0];
    const B: Point = [Math.cos(rad(a)), Math.sin(rad(a))];
    const C = add(B, [1, 0]);
    const direction: Point = [Math.cos(rad(180 - e)), -Math.sin(rad(180 - e))];
    const E = sub(B, direction);
    const F = intersect(B, direction, C, sub(D, C));
    return [angle(A, B, E), angle(D, B, F)];
  }
  if (q.prompt.includes('ADE')) {
    const a = given(q, 'DAB'), e = given(q, 'DEB');
    const D: Point = [-1, 0];
    const A: Point = [0, 1 / Math.tan(rad(a / 2))];
    const E: Point = [0, 1 / Math.tan(rad(e / 2))];
    return [angle(A, D, E)];
  }
  if (q.prompt.includes('XYO')) {
    const a = given(q, 'XWZ'), supplied = given(q, 'XOY');
    const X: Point = [1, 0];
    const Z: Point = [Math.cos(rad(a)), -Math.sin(rad(a))];
    const Y = add(Z, [1, 0]);
    // Along the open diagonal from Z to X, angle XOY increases strictly.
    // Locate O using its visible angle instead of the generator's sine rule.
    let low = 1e-9, high = 1 - 1e-9;
    for (let i = 0; i < 70; i++) {
      const middle = (low + high) / 2;
      const O = interpolate(Z, X, middle);
      if (angle(X, O, Y) < supplied) low = middle;
      else high = middle;
    }
    const O = interpolate(Z, X, (low + high) / 2);
    expect(angle(X, O, Y)).toBeCloseTo(supplied, 8);
    return [angle(X, Y, O)];
  }
  throw new Error('Unrecognised visible task');
}

function storedAnswers(q: Question): number[] {
  if (!q.structuredResponse) return [Number(q.answer)];
  const values: unknown = JSON.parse(q.answer);
  if (!Array.isArray(values) || values.some(v => typeof v !== 'string')) throw new Error('Expected string entries');
  return values.map(Number);
}

function inspectDiagram(q: Question) {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const edges: [Point, Point][] = [];
  for (const mark of picture.marks) {
    if (mark.kind === 'line') edges.push([[mark.x1, mark.y1], [mark.x2, mark.y2]]);
    if (mark.kind === 'text') {
      expect(mark.x).toBeGreaterThanOrEqual(0);
      expect(mark.x).toBeLessThanOrEqual(310);
      expect(mark.y).toBeGreaterThanOrEqual(0);
      expect(mark.y).toBeLessThanOrEqual(200);
    }
  }
  const points = edges.flat();
  for (const p of points) {
    expect(p.every(Number.isFinite)).toBe(true);
    expect(p[0]).toBeGreaterThanOrEqual(0);
    expect(p[0]).toBeLessThanOrEqual(320);
    expect(p[1]).toBeGreaterThanOrEqual(0);
    expect(p[1]).toBeLessThanOrEqual(200);
  }
  const vertex = (name: string): Point => {
    const label = picture.marks.find(m => m.kind === 'text' && m.text === name);
    if (!label || label.kind !== 'text' || points.length === 0) throw new Error(`Missing vertex ${name}`);
    const location: Point = [label.x, label.y];
    const nearest = points.reduce((best, p) => distance(p, location) < distance(best, location) ? p : best);
    expect(distance(nearest, location)).toBeLessThan(23);
    return nearest;
  };
  const hasEdge = (a: Point, b: Point) => edges.some(([u, v]) =>
    (distance(u, a) < 1e-8 && distance(v, b) < 1e-8) ||
    (distance(u, b) < 1e-8 && distance(v, a) < 1e-8));
  const rhombus = (names: string): Point[] => {
    const vertices = names.split('').map(vertex);
    const side = distance(vertices[0], vertices[1]);
    expect(side).toBeGreaterThan(10);
    for (let i = 0; i < 4; i++) {
      expect(distance(vertices[i], vertices[(i + 1) % 4])).toBeCloseTo(side, 7);
      expect(hasEdge(vertices[i], vertices[(i + 1) % 4])).toBe(true);
    }
    expect(cross(sub(vertices[1], vertices[0]), sub(vertices[2], vertices[3]))).toBeCloseTo(0, 7);
    return vertices;
  };
  const onOpenSegment = (p: Point, a: Point, b: Point) => {
    expect(cross(sub(p, a), sub(b, a))).toBeCloseTo(0, 7);
    expect(dot(sub(p, a), sub(p, b))).toBeLessThan(0);
  };
  return {vertex, hasEdge, rhombus, onOpenSegment};
}

function checkGeometry(q: Question): void {
  const d = inspectDiagram(q);
  if (q.prompt.includes('(a)')) {
    const [A, B, C, D] = d.rhombus('ABCD');
    const E = d.vertex('E'), F = d.vertex('F');
    d.onOpenSegment(F, C, D);
    d.onOpenSegment(B, E, F);
    expect(d.hasEdge(B, D)).toBe(true);
    expect(d.hasEdge(E, F)).toBe(true);
    expect(angle(B, A, D)).toBeCloseTo(given(q, 'BAD'), 7);
    expect(angle(E, B, C)).toBeCloseTo(given(q, 'EBC'), 7);
    const answers = storedAnswers(q);
    expect(angle(A, B, E)).toBeCloseTo(answers[0], 7);
    expect(angle(D, B, F)).toBeCloseTo(answers[1], 7);
  } else if (q.prompt.includes('ADE')) {
    const outer = d.rhombus('ABCD');
    const [A, B, , D] = outer;
    const [E, , F] = d.rhombus('EBFD');
    expect(d.hasEdge(B, D)).toBe(true);
    for (const p of [E, F]) {
      const signs = outer.map((v, i) => cross(sub(outer[(i + 1) % 4], v), sub(p, v)));
      expect(signs.every(s => s > 0) || signs.every(s => s < 0)).toBe(true);
    }
    expect(angle(D, A, B)).toBeCloseTo(given(q, 'DAB'), 7);
    expect(angle(D, E, B)).toBeCloseTo(given(q, 'DEB'), 7);
    expect(angle(A, D, E)).toBeCloseTo(Number(q.answer), 7);
  } else {
    const [W, X, Y, Z] = d.rhombus('WXYZ');
    const O = d.vertex('O');
    d.onOpenSegment(O, X, Z);
    expect(d.hasEdge(X, Z)).toBe(true);
    expect(d.hasEdge(O, Y)).toBe(true);
    expect(angle(X, W, Z)).toBeCloseTo(given(q, 'XWZ'), 7);
    expect(angle(X, O, Y)).toBeCloseTo(given(q, 'XOY'), 7);
    expect(angle(X, Y, O)).toBeCloseTo(Number(q.answer), 7);
  }
}

describe('rhombus vertex angle candidate', () => {
  it('independently solves visible givens and checks all three diagram configurations across seeds', () => {
    const variants = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (let seed = -40; seed <= 40; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible({prompt: q.prompt, context: q.context});
        const actual = storedAnswers(q);
        expect(actual).toHaveLength(expected.length);
        actual.forEach((value, i) => {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThan(180);
          expect(value).toBeCloseTo(expected[i], 8);
        });
        expect(q.unit).toBe('degrees');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toBe(q.workedSteps!.map(s => s.text).join(' '));
        checkGeometry(q);
        variants.add(q.prompt);
        visibleQuestions.add(JSON.stringify([q.prompt, q.context]));
      }
    }
    expect(variants.size).toBe(3);
    expect(visibleQuestions.size).toBeGreaterThan(40);
  });

  it('preserves both linked answers and rejects incomplete, swapped or incorrect entries', () => {
    const q = [0, 1, 2].map(index => makeRagQuestion(21, index)).find(q => q.structuredResponse);
    if (!q?.structuredResponse) throw new Error('Missing linked-parts variant');
    expect(q.structuredResponse.kind).toBe('number-pair');
    const expected = solveVisible({prompt: q.prompt, context: q.context}).map(n => String(Math.round(n)));
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([expected[1], expected[0]]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([expected[0]]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([expected[0], String(Number(expected[1]) + 1)]))).toBe(false);
  });

  it('is deterministic and exposes the required family metadata', () => {
    expect(makeRagQuestion(12345, 2)).toEqual(makeRagQuestion(12345, 2));
    expect(makeRagQuestion(12345)).toEqual(makeRagQuestion(12345, 0));
    const questions = Array.from({length: 12}, (_, i) => makeRagQuestion(12345, i));
    expect(new Set(questions.map(q => q.key)).size).toBe(12);
    expect(new Set(questions.slice(0, 3).map(q => q.prompt)).size).toBe(3);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rhombus-vertex-angle-propagation');
    const allowed = new Set(['P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03', 'P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.ANGLE.04']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });
});
