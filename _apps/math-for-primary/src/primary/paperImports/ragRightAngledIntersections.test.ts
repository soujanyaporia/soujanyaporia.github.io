import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragRightAngledIntersections';

type Vec = [number, number];
type Visible = Pick<Question, 'prompt' | 'context'>;
const sin = (a: number) => Math.sin(a * Math.PI / 180);
const cos = (a: number) => Math.cos(a * Math.PI / 180);
const subtract = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const reverse = (v: Vec): Vec => [-v[0], -v[1]];
function angle(u: Vec, v: Vec): number {
  const dot = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}
function rotate(v: Vec, a: number): Vec {
  return [v[0] * cos(a) - v[1] * sin(a), v[0] * sin(a) + v[1] * cos(a)];
}
function givens(q: Visible): Record<string, number> {
  const result: Record<string, number> = {};
  for (const match of (q.context ?? []).join(' ').matchAll(/∠([A-Z]{3}) = (\d+)°/g)) {
    result[match[1]] = Number(match[2]);
  }
  return result;
}

// Independent solver: construct unit ray directions from the displayed angles.
// It receives no answer, worked steps, diagram-generation parameters or seed.
function solveVisible(q: Visible): number[] {
  const g = givens(q);
  if (q.prompt === 'Find ∠AFD.' && g.BAC !== undefined && g.BED !== undefined) {
    const towardA: Vec = [-sin(g.BAC), cos(g.BAC)];
    const towardD: Vec = [-cos(g.BED), sin(g.BED)];
    return [angle(towardA, towardD)];
  }
  if (q.prompt === 'Find ∠ABE.' && g.DCE !== undefined && g.BEC !== undefined) {
    const fromEtoC: Vec = [sin(g.DCE), cos(g.DCE)];
    const fromEtoB = rotate(fromEtoC, g.BEC);
    return [angle([0, -1], reverse(fromEtoB))];
  }
  if (q.prompt === 'Find (a) ∠ECA and (b) ∠FEC.' && g.EAC !== undefined && g.BCE !== undefined && g.DFE !== undefined) {
    const fromCtoA: Vec = [-cos(g.EAC), sin(g.EAC)];
    const fromCtoE: Vec = [-sin(g.BCE), cos(g.BCE)];
    const fromEtoF: Vec = [cos(g.DFE), -sin(g.DFE)];
    return [angle(fromCtoE, fromCtoA), angle(fromEtoF, reverse(fromCtoE))];
  }
  throw new Error('Missing or unrecognised visible givens');
}

function picture(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Expected a supported rectangle diagram');
  return q.picture;
}

// Recover named vertices from rendered labels and segment endpoints, not generator helpers.
function vertices(q: Question): Record<string, Vec> {
  const pic = picture(q), endpoints: Vec[] = [], result: Record<string, Vec> = {};
  for (const mark of pic.marks) {
    if (mark.kind === 'line') endpoints.push([mark.x1, mark.y1], [mark.x2, mark.y2]);
  }
  for (const mark of pic.marks) {
    if (mark.kind !== 'text' || !/^[A-F]$/.test(mark.text)) continue;
    const centre: Vec = [mark.x + 5, mark.y - 7];
    const nearest = [...endpoints].sort((a, b) => Math.hypot(...subtract(a, centre)) - Math.hypot(...subtract(b, centre)))[0];
    if (!nearest) throw new Error('Vertex has no drawn endpoint');
    result[mark.text] = nearest;
  }
  return result;
}

function drawnAngle(p: Record<string, Vec>, name: string): number {
  const [a, v, b] = name.split('').map(letter => p[letter]);
  if (!a || !v || !b) throw new Error(`Missing vertex in ${name}`);
  return angle(subtract(a, v), subtract(b, v));
}
function strictlyBetween(a: Vec, p: Vec, b: Vec) {
  const u = subtract(p, a), v = subtract(b, a);
  expect(u[0] * v[1] - u[1] * v[0]).toBeCloseTo(0, 7);
  const t = (u[0] * v[0] + u[1] * v[1]) / (v[0] ** 2 + v[1] ** 2);
  expect(t).toBeGreaterThan(0);
  expect(t).toBeLessThan(1);
}

function verifyDiagram(q: Question, expected: number[]) {
  const p = vertices(q), g = givens(q);
  for (const name of ['DAB', 'ABC', 'BCD', 'CDA']) expect(drawnAngle(p, name)).toBeCloseTo(90, 7);
  for (const [name, value] of Object.entries(g)) expect(drawnAngle(p, name)).toBeCloseTo(value, 7);
  const targets = Array.from(q.prompt.matchAll(/∠([A-Z]{3})/g), m => m[1]);
  expect(targets).toHaveLength(expected.length);
  targets.forEach((name, i) => expect(drawnAngle(p, name)).toBeCloseTo(expected[i], 7));
  if (g.BAC !== undefined) {
    strictlyBetween(p.B, p.E, p.C);
    strictlyBetween(p.A, p.F, p.C);
    strictlyBetween(p.D, p.F, p.E);
  } else if (g.DCE !== undefined) {
    strictlyBetween(p.A, p.E, p.D);
  } else {
    strictlyBetween(p.A, p.E, p.B);
    strictlyBetween(p.D, p.F, p.C);
  }
  for (const mark of picture(q).marks) {
    const locations: Vec[] = mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]] : mark.kind === 'text' ? [[mark.x, mark.y]] : [];
    for (const [x, y] of locations) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(200);
    }
  }
}

describe('rectangle angle candidate', () => {
  it('checks the independent ray solver against hand-calculated examples', () => {
    const cases: [Visible, number[]][] = [
      [{prompt: 'Find ∠AFD.', context: ['∠BAC = 60° and ∠BED = 132°.']}, [102]],
      [{prompt: 'Find ∠ABE.', context: ['∠DCE = 34° and ∠BEC = 57°.']}, [23]],
      [{prompt: 'Find (a) ∠ECA and (b) ∠FEC.', context: ['∠DFE = 114°, ∠EAC = 26° and ∠BCE = 42°.']}, [22, 66]],
    ];
    for (const [visible, expected] of cases) {
      solveVisible(visible).forEach((value, i) => expect(value).toBeCloseTo(expected[i], 8));
    }
  });

  it('independently solves varied visible givens and checks the drawn geometry', () => {
    const variants = new Map<string, Set<string>>();
    for (const seed of [0, 1, 7, 73, -9, 998, 65536, 4294967295, Number.MAX_SAFE_INTEGER]) {
      for (let index = 0; index < 18; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        const visible: Visible = {prompt: q.prompt, context: q.context};
        const expected = solveVisible(visible);
        const actual: number[] = q.structuredResponse ? JSON.parse(q.answer).map(Number) : [Number(q.answer)];
        expect(actual).toHaveLength(expected.length);
        expected.forEach((value, i) => {
          expect(actual[i]).toBeCloseTo(value, 7);
          expect(Number.isInteger(actual[i])).toBe(true);
          expect(actual[i]).toBeGreaterThan(0);
          expect(actual[i]).toBeLessThan(180);
        });
        verifyDiagram(q, expected);
        expect(q.unit).toBe('°');
        expect((q.workedSteps ?? []).length).toBeGreaterThanOrEqual(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect(JSON.stringify(q)).not.toMatch(/sgexam|\.pdf|data:image|\/Users\//i);
        if (!variants.has(q.prompt)) variants.set(q.prompt, new Set());
        variants.get(q.prompt)!.add(JSON.stringify(q.context));
      }
    }
    expect(variants.size).toBe(3);
    for (const questions of variants.values()) expect(questions.size).toBeGreaterThanOrEqual(8);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-right-angled-figure-intersecting-segments');
  });

  it('keeps both linked parts and grades their ordered responses with the existing control', () => {
    const q = Array.from({length: 3}, (_, index) => makeRagQuestion(29, index)).find(item => item.structuredResponse);
    if (!q?.structuredResponse || q.structuredResponse.kind !== 'number-pair') throw new Error('Missing linked pair');
    const expected = solveVisible({prompt: q.prompt, context: q.context}).map(value => String(Math.round(value)));
    expect(q.structuredResponse.firstLabel).toContain('ECA');
    expect(q.structuredResponse.secondLabel).toContain('FEC');
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([...expected].reverse()))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([expected[0]]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([expected[0], String(Number(expected[1]) + 1)]))).toBe(false);
  });
});
