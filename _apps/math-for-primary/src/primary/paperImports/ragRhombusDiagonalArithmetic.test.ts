import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragRhombusDiagonalArithmetic';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Point = [number, number];

function angles(q: Visible): Record<string, number> {
  const result: Record<string, number> = {};
  for (const match of (q.context ?? []).join(' ').matchAll(/∠([A-Z]{3}) = (\d+)°/g)) {
    if (match[1] in result) throw new Error('Repeated given');
    result[match[1]] = Number(match[2]);
  }
  return result;
}

function uniqueAngle(condition: (n: number) => boolean): number {
  const candidates = Array.from({length: 179}, (_, i) => i + 1).filter(condition);
  if (candidates.length !== 1) throw new Error(`Expected one solution, found ${candidates.length}`);
  return candidates[0];
}

// Only pupil-visible prose is accepted. Answers, worked steps, keys and generation parameters are unavailable.
function solveVisible(q: Visible): number[] {
  const g = angles(q), text = (q.context ?? []).join(' ');
  if (q.prompt.includes('∠DBG')) {
    if (!text.includes('ABGF is a rhombus') || !text.includes('parallel sides are BD and FE') || !text.includes('B is between A and C') || !text.includes('G is between F and D')) {
      throw new Error('Missing shape or incidence givens');
    }
    // Four interior angles total 360°. Two opposite angles each contain two copies of AFB.
    const otherVertex = uniqueAngle(n => 2 * n + 4 * g.AFB === 360);
    const p = uniqueAngle(n => n + g.CBD === otherVertex);
    const qAngle = uniqueAngle(n => n + g.CBD + g.GDE === 180);
    return [p, qAngle];
  }
  if (q.prompt.includes('∠FAC')) {
    if (!text.includes('rhombus ABCG') || !text.includes('parallelogram ACDE') || !text.includes('F is between A and E') || !text.includes('between G and C')) {
      throw new Error('Missing joined-shape givens');
    }
    const base = uniqueAngle(n => 2 * n + g.ABC === 180);
    const p = uniqueAngle(n => n + g.GAF === base);
    // The adjacent parallelogram angles consist of p and the three parts at C.
    const qAngle = uniqueAngle(n => p + base + g.FCE + n === 180);
    return [p, qAngle];
  }
  throw new Error('Unknown visible angle task');
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function measuredAngle(a: Point, b: Point, c: Point): number {
  const u = sub(a, b), v = sub(c, b);
  const cosine = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
function parallel(a: Point, b: Point, c: Point, d: Point): void {
  expect(cross(sub(b, a), sub(d, c)) / (distance(a, b) * distance(c, d))).toBeCloseTo(0, 8);
}
function between(a: Point, b: Point, c: Point): void {
  expect(distance(a, b)).toBeGreaterThan(1);
  expect(distance(b, c)).toBeGreaterThan(1);
  expect(distance(a, b) + distance(b, c)).toBeCloseTo(distance(a, c), 7);
}
function intersection(a: Point, b: Point, c: Point, d: Point): Point {
  const ab = sub(b, a), cd = sub(d, c);
  const t = cross(sub(c, a), cd) / cross(ab, cd);
  return [a[0] + t * ab[0], a[1] + t * ab[1]];
}
function rhombus(a: Point, b: Point, c: Point, d: Point): void {
  const side = distance(a, b);
  for (const length of [distance(b, c), distance(c, d), distance(d, a)]) expect(length).toBeCloseTo(side, 7);
  parallel(a, b, d, c);
  parallel(a, d, b, c);
}

// Recover the coordinates from actual drawable line marks, without importing construction helpers.
function verifyDrawing(q: Question): void {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const lines = picture.marks.filter(mark => mark.kind === 'line');
  const start = (i: number): Point => [lines[i].x1, lines[i].y1];
  const end = (i: number): Point => [lines[i].x2, lines[i].y2];
  const visible: Visible = {prompt: q.prompt, context: q.context};
  const g = angles(visible), expected = solveVisible(visible);
  if (q.prompt.includes('∠DBG')) {
    const A = start(0), B = end(0), G = end(1), F = end(2), C = end(4), D = end(5), E = end(9);
    rhombus(A, B, G, F);
    parallel(B, C, G, D);
    parallel(B, G, C, D);
    parallel(B, D, F, E);
    between(A, B, C);
    between(F, G, D);
    expect(measuredAngle(A, F, B)).toBeCloseTo(g.AFB, 7);
    expect(measuredAngle(C, B, D)).toBeCloseTo(g.CBD, 7);
    expect(measuredAngle(G, D, E)).toBeCloseTo(g.GDE, 7);
    expect(measuredAngle(D, B, G)).toBeCloseTo(expected[0], 7);
    expect(measuredAngle(D, E, F)).toBeCloseTo(expected[1], 7);
  } else {
    const A = start(0), B = end(0), C = end(1), G = end(2), E = end(5), D = end(6);
    const F = intersection(A, E, G, C);
    rhombus(A, B, C, G);
    parallel(A, C, E, D);
    parallel(A, E, C, D);
    between(A, F, E);
    between(G, F, C);
    expect(measuredAngle(A, B, C)).toBeCloseTo(g.ABC, 7);
    expect(measuredAngle(G, A, F)).toBeCloseTo(g.GAF, 7);
    expect(measuredAngle(F, C, E)).toBeCloseTo(g.FCE, 7);
    expect(measuredAngle(F, A, C)).toBeCloseTo(expected[0], 7);
    expect(measuredAngle(E, C, D)).toBeCloseTo(expected[1], 7);
  }
  const texts = picture.marks.filter(mark => mark.kind === 'text');
  for (const name of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'p', 'q']) {
    expect(texts.filter(mark => mark.text === name)).toHaveLength(1);
  }
  for (const mark of picture.marks) {
    const points: Point[] = mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]] : mark.kind === 'text' ? [[mark.x, mark.y]] : [];
    for (const [x, y] of points) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThan(4);
      expect(x).toBeLessThan(305);
      expect(y).toBeGreaterThan(4);
      expect(y).toBeLessThan(195);
    }
    if (mark.kind === 'path') expect(mark.d).not.toMatch(/NaN|Infinity/);
  }
}

describe('rhombus diagonal half-angle arithmetic', () => {
  it('independently solves both visible parts across varied seeds and indices', () => {
    const variations = new Map<string, Set<string>>();
    for (let seed = 0; seed < 120; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible({prompt: q.prompt, context: q.context});
        expect(JSON.parse(q.answer)).toEqual(expected.map(String));
        for (const answer of expected) {
          expect(Number.isInteger(answer)).toBe(true);
          expect(answer).toBeGreaterThan(0);
          expect(answer).toBeLessThan(180);
        }
        expect(q.unit).toBe('°');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse?.kind).toBe('number-fields');
        if (q.structuredResponse?.kind !== 'number-fields') throw new Error('Expected two numeric fields');
        expect(q.structuredResponse.fields.map(field => field.label)).toEqual(q.prompt.includes('∠DBG') ? ['(a) ∠DBG (°)', '(b) ∠DEF (°)'] : ['(a) ∠FAC (°)', '(b) ∠ECD (°)']);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(expected.map(String)))).toBe(true);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([String(expected[1]), String(expected[0])]))).toBe(false);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([String(expected[0])]))).toBe(false);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([String(expected[0]), String(expected[1] + 1)]))).toBe(false);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.explanation).toContain('(a)');
        expect(q.explanation).toContain('(b)');
        expect(q.hint.length).toBeGreaterThan(30);
        const seen = variations.get(q.prompt) ?? new Set<string>();
        seen.add(JSON.stringify(q.context));
        variations.set(q.prompt, seen);
      }
    }
    expect(variations.size).toBe(2);
    for (const cases of variations.values()) expect(cases.size).toBeGreaterThan(20);
  });

  it('draws equal sides, parallel lines, incidences and angles consistent with the visible givens', () => {
    for (let seed = 0; seed < 100; seed++) {
      for (let index = 0; index < 2; index++) verifyDrawing(makeRagQuestion(seed, index));
    }
  });

  it('changes its independent solution when only the visible givens change', () => {
    const first = makeRagQuestion(10, 0);
    const g = angles(first), original = solveVisible(first);
    const changed: Visible = {
      prompt: first.prompt,
      context: first.context!.map(line => line.replace(`∠AFB = ${g.AFB}°`, `∠AFB = ${g.AFB + 1}°`)),
    };
    expect(solveVisible(changed)).toEqual([original[0] - 2, original[1]]);
    const second = makeRagQuestion(10, 1);
    const h = angles(second), before = solveVisible(second);
    const changedOffset: Visible = {
      prompt: second.prompt,
      context: second.context!.map(line => line.replace(`∠GAF = ${h.GAF}°`, `∠GAF = ${h.GAF + 2}°`)),
    };
    expect(solveVisible(changedOffset)).toEqual([before[0] - 2, before[1] + 2]);
  });

  it('is deterministic and identifies the P6 family', () => {
    for (const seed of [-11, 0, 1, 987654, 4294967295]) {
      for (const index of [0, 1, 9]) expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(12, 0).key).not.toBe(makeRagQuestion(12, 1).key);
    expect(makeRagQuestion(12, 0).prompt).not.toBe(makeRagQuestion(12, 1).prompt);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-rhombus-diagonal-half-angle-arithmetic');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.SHAPE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02']);
  });
});
