import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragP5SharedHeightAreaFractions';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Point = [number, number];
type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;

function area(points: Point[]): number {
  return Math.abs(points.reduce((sum, a, i) => {
    const b = points[(i + 1) % points.length];
    return sum + a[0] * b[1] - b[0] * a[1];
  }, 0)) / 2;
}

function simplest(a: number, b: number): [number, number] {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a <= 0 || b <= 0) {
    throw new Error('Expected positive whole-number area units');
  }
  let common = Math.min(a, b);
  while (a % common !== 0 || b % common !== 0) common--;
  return [a / common, b / common];
}

// This solver receives only information shown to the pupil. It assigns convenient
// coordinates consistent with the written givens, then computes polygon areas.
function solveVisible(q: Visible): {kind: 'rectangle' | 'triangles'; terms: [number, number]} {
  const text = (q.context ?? []).join(' ');
  if (text.includes('PQRS is a rectangle.')) {
    if (!text.includes('T is the midpoint of QR, so QT = TR.') ||
        !text.includes('U lies on PS. Only triangle QTU is shaded.')) {
      throw new Error('Missing rectangle constraints');
    }
    const whole = area([[0, 0], [0, 6], [10, 6], [10, 0]]);
    const shaded = area([[0, 6], [5, 6], [7, 0]]);
    return {kind: 'rectangle', terms: simplest(shaded, whole - shaded)};
  }
  const relation = /QR is (\d+) times SQ\./.exec(text);
  if (!relation || !text.includes('S, Q and R lie on one straight line, in that order.') ||
      !text.includes('PS is perpendicular to SR.')) {
    throw new Error('Missing shared-height constraints');
  }
  const factor = Number(relation[1]);
  const S: Point = [0, 0], Q: Point = [2, 0];
  const R: Point = [2 + factor * 2, 0], P: Point = [0, 8];
  return {kind: 'triangles', terms: simplest(area([P, Q, R]), area([P, S, R]))};
}

function diagram(q: Visible): Diagram {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  return q.picture;
}

function points(d: string): Point[] {
  if (!/^M .* Z$/.test(d)) throw new Error('Expected a closed polygon');
  const values = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  if (values.length < 6 || values.length % 2) throw new Error('Invalid polygon coordinates');
  const result: Point[] = [];
  for (let i = 0; i < values.length; i += 2) result.push([values[i], values[i + 1]]);
  return result;
}

function checkGeometry(q: Visible): void {
  const solved = solveVisible(q), fig = diagram(q);
  for (const mark of fig.marks) {
    if (mark.kind === 'text') {
      expect(mark.x).toBeGreaterThanOrEqual(0);
      expect(mark.x).toBeLessThan(300);
      expect(mark.y).toBeGreaterThanOrEqual(15);
      expect(mark.y).toBeLessThan(190);
    }
  }
  if (solved.kind === 'rectangle') {
    const paths = fig.marks.filter(m => m.kind === 'path');
    const shadedPath = paths.find(p => p.fill && p.fill !== 'none');
    const outerPath = paths.find(p => p.fill === 'none');
    if (!shadedPath || !outerPath) throw new Error('Missing visible regions');
    const shaded = points(shadedPath.d), outer = points(outerPath.d);
    expect(shaded).toHaveLength(3);
    expect(outer).toHaveLength(4);
    const [P, Q, R, S] = outer;
    const [baseStart, midpoint, apex] = shaded;
    expect(P[0]).toBe(Q[0]);
    expect(R[0]).toBe(S[0]);
    expect(P[1]).toBe(S[1]);
    expect(Q[1]).toBe(R[1]);
    expect(baseStart).toEqual(Q);
    expect(midpoint).toEqual([(Q[0] + R[0]) / 2, Q[1]]);
    expect(apex[1]).toBe(P[1]);
    expect(apex[0]).toBeGreaterThan(P[0]);
    expect(apex[0]).toBeLessThan(S[0]);
    const shadedArea = area(shaded), whole = area(outer);
    expect(shadedArea / (whole - shadedArea)).toBeCloseTo(solved.terms[0] / solved.terms[1], 10);
    const ticks = fig.marks.filter(m => m.kind === 'line');
    expect(ticks).toHaveLength(4);
    for (const mark of ticks) {
      expect(mark.x1).toBe(mark.x2);
      expect((mark.y1 + mark.y2) / 2).toBe(Q[1]);
    }
    return;
  }
  const lines = fig.marks.filter(m => m.kind === 'line');
  const altitude = lines.find(m => m.dashed && m.x1 === m.x2);
  const extension = lines.find(m => m.dashed && m.y1 === m.y2);
  const base = lines.find(m => !m.dashed && m.y1 === m.y2);
  if (!altitude || !extension || !base) throw new Error('Missing base or altitude');
  const P: Point = [altitude.x1, altitude.y1];
  const S: Point = [altitude.x2, altitude.y2];
  const Q: Point = [base.x1, base.y1], R: Point = [base.x2, base.y2];
  expect([extension.x1, extension.y1]).toEqual(S);
  expect([extension.x2, extension.y2]).toEqual(Q);
  expect(S[1]).toBe(R[1]);
  expect(S[0]).toBeLessThan(Q[0]);
  expect(Q[0]).toBeLessThan(R[0]);
  const factor = Number(/QR is (\d+) times SQ\./.exec((q.context ?? []).join(' '))![1]);
  expect((R[0] - Q[0]) / (Q[0] - S[0])).toBe(factor);
  expect(area([P, Q, R]) / area([P, S, R])).toBeCloseTo(solved.terms[0] / solved.terms[1], 10);
  for (const endpoint of [Q, R]) {
    expect(lines.some(m => m.x1 === P[0] && m.y1 === P[1] &&
      m.x2 === endpoint[0] && m.y2 === endpoint[1])).toBe(true);
  }
}

describe('shared-height area fractions candidate', () => {
  it('independently solves visible givens and checks diagrams across seeds and indices', () => {
    const kinds = new Set<string>(), triangleAnswers = new Set<string>(), pictures = new Set<string>();
    for (let seed = -12; seed <= 64; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context, picture: q.picture});
        const [a, b] = solved.terms;
        kinds.add(solved.kind);
        pictures.add(JSON.stringify(q.picture));
        checkGeometry(q);
        expect(q.unit).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toContain(q.workedSteps![0].text);
        if (solved.kind === 'triangles') {
          const expected = `${a}:${b}`;
          triangleAnswers.add(expected);
          expect(q.answer).toBe(expected);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => correctAnswer(q, choice))).toEqual([expected]);
          expect(correctAnswer(q, `${b}:${a}`)).toBe(false);
        } else {
          const expected = JSON.stringify([String(a), String(b)]);
          expect(q.answer).toBe(expected);
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse?.kind).toBe('number-pair');
          expect(correctAnswer(q, expected)).toBe(true);
          expect(correctAnswer(q, JSON.stringify([String(b), String(a)]))).toBe(false);
          expect(correctAnswer(q, JSON.stringify([String(2 * a), String(2 * b)]))).toBe(false);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['rectangle', 'triangles']);
    expect(triangleAnswers.size).toBe(4);
    expect(pictures.size).toBeGreaterThan(12);
  });

  it('is deterministic and cycles through both variants for each seed', () => {
    for (const seed of [-2147483648, -1, 0, 1, 87, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const first = makeRagQuestion(seed, 0), second = makeRagQuestion(seed, 1);
      expect(first).toEqual(makeRagQuestion(seed, 0));
      expect(second).toEqual(makeRagQuestion(seed, 1));
      expect(first.key).not.toBe(second.key);
      expect(solveVisible(first).kind).not.toBe(solveVisible(second).kind);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-equal-part-and-shared-height-area-fractions');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03']);
  });
});
