import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragTriangleClosureAfterParallelTransfer';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'structuredResponse'>;
type Point = [number, number];

function givens(q: Visible): Record<string, number> {
  const result: Record<string, number> = {};
  for (const match of (q.context ?? []).join(' ').matchAll(/∠([A-Z]{3}) = (\d+)°/g)) {
    if (match[1] in result) throw new Error('Repeated angle given');
    result[match[1]] = Number(match[2]);
  }
  return result;
}

function uniqueAngle(condition: (angle: number) => boolean): number {
  const possible = Array.from({length: 179}, (_, i) => i + 1).filter(condition);
  if (possible.length !== 1) throw new Error(`Expected one angle, found ${possible.length}`);
  return possible[0];
}
const straightPartner = (angle: number) => uniqueAngle(x => x + angle === 180);
const triangleThird = (a: number, b: number) => uniqueAngle(x => a + b + x === 180);

// This solver receives only pupil-visible fields, not answers, proofs or worked steps.
function solveVisible(q: Visible): number[] {
  const a = givens(q);
  const text = (q.context ?? []).join(' ');
  if (q.prompt.includes('∠ADC')) {
    if (!text.includes('ABEF is a parallelogram') || !text.includes('AD and BE meet at G')) throw new Error('Missing geometry');
    const atD = triangleThird(a.AFE, a.AGB);
    return [triangleThird(atD, a.ACD)];
  }
  if (q.prompt.includes('∠MNL')) {
    if (!text.includes('JKLM is a parallelogram') || !text.includes('L between K and N')) throw new Error('Missing extension');
    return [triangleThird(straightPartner(a.KJM), a.LMN)];
  }
  if (q.prompt.includes('∠ABC') && q.prompt.includes('∠EFG')) {
    if (!text.includes('rhombus ABCD') || !text.includes('DC is parallel to side EF')) throw new Error('Missing shape or parallel sides');
    const atD = straightPartner(a.EDC);
    return [uniqueAngle(x => x === a.ADG + atD), triangleThird(atD, a.DGC)];
  }
  throw new Error('Unrecognised visible task');
}

const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function angle(a: Point, b: Point, c: Point): number {
  const u = [a[0] - b[0], a[1] - b[1]], v = [c[0] - b[0], c[1] - b[1]];
  const cosine = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
function cross(a: Point, b: Point): number { return a[0] * b[1] - a[1] * b[0]; }
function sub(a: Point, b: Point): Point { return [a[0] - b[0], a[1] - b[1]]; }
function intersection(a: Point, b: Point, c: Point, d: Point): Point {
  const ab = sub(b, a), cd = sub(d, c);
  const t = cross(sub(c, a), cd) / cross(ab, cd);
  return [a[0] + t * ab[0], a[1] + t * ab[1]];
}
function parallel(a: Point, b: Point, c: Point, d: Point): void {
  expect(cross(sub(b, a), sub(d, c)) / (distance(a, b) * distance(c, d))).toBeCloseTo(0, 8);
}
function between(a: Point, b: Point, c: Point): void {
  expect(distance(a, b)).toBeGreaterThan(0.1);
  expect(distance(b, c)).toBeGreaterThan(0.1);
  expect(distance(a, b) + distance(b, c)).toBeCloseTo(distance(a, c), 7);
}

// Recover geometry from rendered line marks; no generator helpers or private parameters are imported.
function verifyGeometry(q: Visible): void {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const lines = picture.marks.filter(m => m.kind === 'line');
  const start = (i: number): Point => [lines[i].x1, lines[i].y1];
  const end = (i: number): Point => [lines[i].x2, lines[i].y2];
  const a = givens(q);
  const expected = solveVisible(q);
  if (q.prompt.includes('∠ADC')) {
    const A = start(0), B = end(0), E = end(1), F = end(2), C = end(4), D = end(5);
    const G = intersection(A, D, B, E);
    parallel(A, B, F, E);
    parallel(A, F, B, E);
    between(A, B, C);
    between(F, E, D);
    between(A, G, D);
    between(B, G, E);
    expect(angle(A, F, E)).toBeCloseTo(a.AFE, 7);
    expect(angle(A, G, B)).toBeCloseTo(a.AGB, 7);
    expect(angle(A, C, D)).toBeCloseTo(a.ACD, 7);
    expect(angle(A, D, C)).toBeCloseTo(expected[0], 7);
  } else if (q.prompt.includes('∠MNL')) {
    const J = start(0), K = end(0), L = end(1), M = end(2), N = end(4);
    parallel(J, K, M, L);
    parallel(J, M, K, L);
    between(K, L, N);
    expect(angle(K, J, M)).toBeCloseTo(a.KJM, 7);
    expect(angle(L, M, N)).toBeCloseTo(a.LMN, 7);
    expect(angle(M, N, L)).toBeCloseTo(expected[0], 7);
  } else {
    const A = start(0), B = end(0), C = end(1), D = end(2), E = start(4), G = end(4), F = end(5);
    const side = distance(A, B);
    for (const length of [distance(B, C), distance(C, D), distance(D, A)]) expect(length).toBeCloseTo(side, 7);
    parallel(A, B, D, C);
    parallel(A, D, B, C);
    parallel(D, C, E, F);
    between(E, D, G);
    between(F, C, G);
    between(A, G, B);
    expect(angle(A, D, G)).toBeCloseTo(a.ADG, 7);
    expect(angle(E, D, C)).toBeCloseTo(a.EDC, 7);
    expect(angle(D, G, C)).toBeCloseTo(a.DGC, 7);
    expect(angle(A, B, C)).toBeCloseTo(expected[0], 7);
    expect(angle(E, F, G)).toBeCloseTo(expected[1], 7);
  }
  for (const mark of picture.marks) {
    const points: Point[] = mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]] : mark.kind === 'text' ? [[mark.x, mark.y]] : [];
    for (const [x, y] of points) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThan(4);
      expect(x).toBeLessThan(310);
      expect(y).toBeGreaterThan(4);
      expect(y).toBeLessThan(190);
    }
  }
}

describe('triangle closure after parallel transfer', () => {
  it('solves visible givens independently across seeds and indices, including both linked parts', () => {
    const tasks = new Map<string, Set<string>>();
    for (let seed = 0; seed < 120; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(q);
        const actual: string[] = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
        expect(actual.map(Number)).toEqual(expected);
        for (const n of expected) {
          expect(Number.isInteger(n)).toBe(true);
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThan(180);
        }
        expect(q.unit).toBe('°');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toContain('180°');
        expect(q.choices).toBeUndefined();
        if (expected.length === 2) {
          expect(q.structuredResponse?.kind).toBe('number-fields');
          if (q.structuredResponse?.kind === 'number-fields') expect(q.structuredResponse.fields.map(f => f.label)).toEqual(['(a) ∠ABC (°)', '(b) ∠EFG (°)']);
        }
        const seen = tasks.get(q.prompt) ?? new Set<string>();
        seen.add(JSON.stringify(q.context));
        tasks.set(q.prompt, seen);
      }
    }
    expect(tasks.size).toBe(3);
    for (const values of tasks.values()) expect(values.size).toBeGreaterThanOrEqual(5);
  });

  it('draws the stated parallel sides, collinear points and actual angles consistently', () => {
    for (let seed = 0; seed < 90; seed++) {
      for (let index = 0; index < 3; index++) verifyGeometry(makeRagQuestion(seed, index));
    }
  });

  it('responds to changed visible givens without consulting a stored answer', () => {
    const q = makeRagQuestion(1);
    const before = solveVisible(q)[0];
    const oldAngle = givens(q).LMN;
    const changed: Visible = {
      prompt: q.prompt,
      context: q.context!.map(line => line.replace(`∠LMN = ${oldAngle}°`, `∠LMN = ${oldAngle + 2}°`)),
    };
    expect(solveVisible(changed)).toEqual([before - 2]);
  });

  it('is reproducible and changes the diagram when the visible givens change', () => {
    for (const seed of [-13, 0, 7, 123456, 4294967295]) {
      expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
    }
    const q = makeRagQuestion(0, 0);
    expect(makeRagQuestion(0, 1).key).not.toBe(q.key);
    const cases = Array.from({length: 30}, (_, i) => makeRagQuestion(3 * i));
    const different = cases.find(item => JSON.stringify(item.context) !== JSON.stringify(cases[0].context));
    expect(different).toBeDefined();
    expect(different!.picture).not.toEqual(cases[0].picture);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('triangle-closure-after-parallel-transfer');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
