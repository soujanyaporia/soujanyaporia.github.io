import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRectangleRightAngleArithmetic';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Givens = {kind: 'extension'; g: number} | {kind: 'crossing'; f: number; c: number};
type Point = [number, number];
function readVisible(q: Visible): Givens {
  const text = (q.context ?? []).join(' ');
  if (q.prompt.includes('∠PST')) {
    if (!text.includes('PQRS is a rectangle') || !text.includes('Q, S and T lie on one straight line, in that order')) throw Error('Missing geometry');
    const m = /angle RST is (\d+)°/.exec(text);
    if (!m) throw Error('Missing exterior angle');
    return {kind: 'extension', g: Number(m[1])};
  }
  if (!q.prompt.includes('∠GAH') || !text.includes('E, A, G and B') || !text.includes('EF is perpendicular to EB') || !text.includes('FG and AH cross at J')) throw Error('Missing geometry');
  const m = /∠EFG = (\d+)° and ∠AJG = (\d+)°/.exec(text);
  if (!m) throw Error('Missing crossing angles');
  return {kind: 'crossing', f: Number(m[1]), c: Number(m[2])};
}

// Enumerate solutions using the pupil-visible constraints, without generation parameters,
// worked steps, proof, answer, key or a seed-to-answer table.
function solveVisible(q: Visible): number {
  const g = readVisible(q);
  const candidates = Array.from({length: 179}, (_, i) => i + 1).filter(x =>
    g.kind === 'extension'
      ? x + 90 + g.g === 360
      : x < 90 && x + g.c + (90 - g.f) === 180,
  );
  if (candidates.length !== 1) throw Error('The visible givens must have exactly one solution');
  return candidates[0];
}

const vector = (a: Point, b: Point): Point => [b[0] - a[0], b[1] - a[1]];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
function angle(a: Point, v: Point, b: Point): number {
  const u = vector(v, a), w = vector(v, b);
  return Math.acos(Math.max(-1, Math.min(1, dot(u, w) / Math.hypot(...u) / Math.hypot(...w)))) * 180 / Math.PI;
}
function intersection(a: Point, b: Point, c: Point, d: Point): Point {
  const u = vector(a, b), v = vector(c, d);
  const t = cross(vector(a, c), v) / cross(u, v);
  return [a[0] + t * u[0], a[1] + t * u[1]];
}
function onSegment(p: Point, a: Point, b: Point): void {
  const u = vector(a, b), v = vector(a, p);
  expect(cross(u, v)).toBeCloseTo(0, 7);
  const fraction = dot(u, v) / dot(u, u);
  expect(fraction).toBeGreaterThan(0);
  expect(fraction).toBeLessThan(1);
}

describe('rectangle right-angle arithmetic candidate', () => {
  it('solves independent visible-only examples', () => {
    expect(solveVisible({
      prompt: 'Find ∠PST.',
      context: ['PQRS is a rectangle. Q, S and T lie on one straight line, in that order. The marked angle RST is 131°.'],
    })).toBe(139);
    expect(solveVisible({
      prompt: 'Find ∠GAH.',
      context: ['E, A, G and B are collinear. EF is perpendicular to EB. FG and AH cross at J. ∠EFG = 61° and ∠AJG = 109°.'],
    })).toBe(42);
  });

  it('has one answer from visible givens across seeds and indices', () => {
    const kinds = new Set<string>(), visible = new Set<string>();
    const seeds = [-999, -1, 0, 1, 2147483647, 4294967295, ...Array.from({length: 96}, (_, i) => i * 37)];
    for (const seed of seeds) for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const g = readVisible(q), solution = solveVisible({prompt: q.prompt, context: q.context});
      kinds.add(g.kind);
      visible.add(JSON.stringify([q.context, q.prompt]));
      expect(q.answer).toBe(String(solution));
      expect(q.unit).toBe('degrees');
      expect(q.choices).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
      expect(q.explanation).toContain(q.workedSteps!.at(-1)!.equation!);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      if (g.kind === 'extension') {
        expect(g.g).toBeGreaterThan(90);
        expect(g.g).toBeLessThan(180);
        expect(g.g).not.toBe(120);
        expect(solution).toBeGreaterThan(90);
      } else {
        expect(g.f).toBeGreaterThan(0);
        expect(g.f).toBeLessThan(90);
        expect(g.c).toBeGreaterThan(90);
        expect(g.c).toBeLessThan(180);
        expect(g.f).not.toBe(59);
        expect(g.c).not.toBe(106);
        expect(solution).toBeLessThan(90);
      }
    }
    expect([...kinds].sort()).toEqual(['crossing', 'extension']);
    expect(visible.size).toBeGreaterThanOrEqual(18);
    expect(makeRagQuestion(8)).toEqual(makeRagQuestion(8, 0));
    expect(readVisible(makeRagQuestion(8, 0)).kind).not.toBe(readVisible(makeRagQuestion(8, 1)).kind);
  });

  it('draws the stated right angles, incidences and marked angles', () => {
    for (let seed = 0; seed < 64; seed++) for (let index = 0; index < 2; index++) {
      const q = makeRagQuestion(seed, index), g = readVisible(q);
      const picture = q.picture;
      if (picture?.type !== 'batch11-upper') throw Error('Unsupported diagram');
      const lines = picture.marks.filter(m => m.kind === 'line').map(m => ({
        a: [m.x1, m.y1] as Point, b: [m.x2, m.y2] as Point,
      }));
      const corners = lines.slice(0, 4).map(l => l.a);
      for (let k = 0; k < 4; k++) {
        expect(angle(corners[(k + 3) % 4], corners[k], corners[(k + 1) % 4])).toBeCloseTo(90, 7);
        expect(Math.hypot(...vector(lines[k].a, lines[k].b))).toBeGreaterThan(20);
      }
      for (const l of lines) for (const p of [l.a, l.b]) {
        expect(p[0]).toBeGreaterThan(0); expect(p[0]).toBeLessThan(320);
        expect(p[1]).toBeGreaterThan(0); expect(p[1]).toBeLessThan(200);
      }
      const labels = picture.marks.filter(m => m.kind === 'text').map(m => m.text);
      if (g.kind === 'extension') {
        const [P, Q, R, S] = corners, T = lines[4].b;
        onSegment(S, Q, T);
        expect(angle(R, S, T)).toBeCloseTo(g.g, 7);
        expect(angle(P, S, T)).toBeCloseTo(solveVisible(q), 7);
        expect(labels).toContain(`${g.g}°`);
        expect(labels).toContain('x');
      } else {
        const [A, B, C, D] = corners;
        const E = lines[4].a, F = lines[5].b, G = lines[6].b, H = lines[7].b;
        onSegment(A, E, B); onSegment(G, A, B); onSegment(H, D, C);
        expect(F[1]).toBeGreaterThan(E[1]);
        expect(angle(F, E, B)).toBeCloseTo(90, 7);
        const J = intersection(F, G, A, H);
        onSegment(J, F, G); onSegment(J, A, H);
        expect(angle(E, F, G)).toBeCloseTo(g.f, 7);
        expect(angle(A, J, G)).toBeCloseTo(g.c, 7);
        expect(angle(G, A, H)).toBeCloseTo(solveVisible(q), 7);
        expect(labels).toContain(`${g.f}°`);
        expect(labels).toContain(`${g.c}°`);
      }
      for (const mark of picture.marks) if (mark.kind === 'text') {
        expect(mark.x).toBeGreaterThanOrEqual(0); expect(mark.x).toBeLessThan(306);
        expect(mark.y).toBeGreaterThanOrEqual(17); expect(mark.y).toBeLessThan(195);
      }
    }
  });

  it('declares the requested family and only supplied curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('rectangle-and-square-right-angle-arithmetic');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.SHAPE.01', 'P5.S.ANGLE.01', 'P5.S.ANGLE.04', 'P5.S.SHAPE.01']);
  });
});
