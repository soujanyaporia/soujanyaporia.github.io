import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragParallelIsoscelesTransfer';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Point = [number, number];
const seeds = [-2147483648, -101, -1, ...Array.from({length: 64}, (_, i) => i), 2147483647];
const visibleText = (q: Visible) => (q.context ?? []).join(' ');
function given(q: Visible, name: string): number {
  const match = new RegExp(`\\bangle ${name} = (\\d+)°`, 'i').exec(visibleText(q));
  if (!match) throw new Error(`Missing visible angle ${name}`);
  return Number(match[1]);
}
function kind(q: Visible): 'parallelogram' | 'trapezium' | 'square' {
  const text = visibleText(q);
  if (text.includes('parallelogram PQRS')) return 'parallelogram';
  if (text.includes('square ABCD')) return 'square';
  if (text.includes('ABCD is a trapezium')) return 'trapezium';
  throw new Error('Unknown visible configuration');
}

/** This oracle receives only displayed prose. It cannot access answers, seeds or generation parameters. */
function solveVisible(q: Visible): string[] {
  const text = visibleText(q);
  switch (kind(q)) {
    case 'parallelogram': {
      expect(text).toContain('Point T is between S and R on side SR');
      expect(text).toContain('PT and TQ have the same length');
      const s = given(q, 'PSR'), p = given(q, 'SPT'), r = given(q, 'SRQ');
      expect(s + r).toBe(180);
      // First solve triangle PST, then transfer at PT between parallel PQ and SR.
      const atT = 180 - s - p;
      // PT = TQ makes the transferred angle equal to the base angle at Q.
      const wholeQ = 180 - r;
      expect(atT).toBeGreaterThan(0);
      return [String(wholeQ - atT)];
    }
    case 'trapezium': {
      expect(text).toContain('Sides AB and DC are parallel');
      expect(text).toContain('E is between A and B');
      expect(text).toContain('ED = EC');
      const a = given(q, 'DAB'), base = given(q, 'EDC');
      const multiplier = /Angle BCE is ([23]) times angle CBE\./.exec(text);
      if (!multiplier) throw new Error('Missing visible angle multiple');
      const k = Number(multiplier[1]);
      // Alternate angles give AED = EDC. Solve triangle ADE directly.
      const first = 180 - a - base;
      // Equal base angles give DCE = EDC; parallel DC and EB give CEB = DCE.
      // Enumerate possible whole-degree angles using the visible triangle constraints.
      const solutions: number[] = [];
      for (let atB = 1; atB < 180; atB++) {
        const atC = k * atB;
        if (atB + atC + base === 180) solutions.push(atC);
      }
      expect(solutions).toHaveLength(1);
      return [String(first), String(solutions[0])];
    }
    case 'square': {
      expect(text).toContain('EF is parallel to CG');
      expect(text).toContain('BE = CE');
      expect(text).toContain('Reflex angle DCG');
      expect(given(q, 'CEF')).toBe(90);
      const outer = given(q, 'DCG'), atF = given(q, 'EFG');
      const smallDCG = 360 - outer;
      const BCG = smallDCG - 90;
      // CE perpendicular to EF and EF parallel to CG imply ECG = 90°.
      const BCE = 90 - BCG;
      return [String(180 - atF), String(BCE)];
    }
  }
}

function picture(q: Question): Batch11UpperPicture {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  return q.picture;
}
function vertex(model: Batch11UpperPicture, name: string): Point {
  const label = model.marks.find((m): m is Extract<Batch11UpperMark, {kind: 'text'}> => m.kind === 'text' && m.text === name);
  const dots = model.marks.filter((m): m is Extract<Batch11UpperMark, {kind: 'circle'}> => m.kind === 'circle');
  if (!label || !dots.length) throw new Error(`Missing visible vertex ${name}`);
  const closest = [...dots].sort((a, b) => Math.hypot(a.cx - label.x, a.cy - label.y) - Math.hypot(b.cx - label.x, b.cy - label.y))[0];
  return [closest.cx, closest.cy];
}
const delta = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const norm = (a: Point) => Math.hypot(a[0], a[1]);
const distance = (a: Point, b: Point) => norm(delta(a, b));
function angle(a: Point, v: Point, b: Point): number {
  const u = delta(a, v), w = delta(b, v);
  const cosine = (u[0] * w[0] + u[1] * w[1]) / (norm(u) * norm(w));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
function expectParallel(a: Point, b: Point, c: Point, d: Point) {
  const u = delta(a, b), v = delta(c, d);
  expect((u[0] * v[1] - u[1] * v[0]) / (norm(u) * norm(v))).toBeCloseTo(0, 8);
}
function expectBetween(a: Point, v: Point, b: Point) {
  expect(distance(a, v) + distance(v, b)).toBeCloseTo(distance(a, b), 7);
  expect(distance(a, v)).toBeGreaterThan(1);
  expect(distance(v, b)).toBeGreaterThan(1);
}
function expectEdge(model: Batch11UpperPicture, a: Point, b: Point) {
  const matches = model.marks.some(m => m.kind === 'line' && (
    (distance([m.x1, m.y1], a) < 1e-7 && distance([m.x2, m.y2], b) < 1e-7) ||
    (distance([m.x1, m.y1], b) < 1e-7 && distance([m.x2, m.y2], a) < 1e-7)
  ));
  expect(matches).toBe(true);
}

function checkGeometry(q: Question, expected: string[]) {
  const model = picture(q);
  const p = (name: string) => vertex(model, name);
  const ang = (a: string, v: string, b: string) => angle(p(a), p(v), p(b));
  const sameLength = (a: string, b: string, c: string, d: string) => expect(distance(p(a), p(b))).toBeCloseTo(distance(p(c), p(d)), 7);
  const edges = (names: string[]) => names.forEach(pair => expectEdge(model, p(pair[0]), p(pair[1])));
  expect(model.label).toContain(q.context![0]);
  for (const mark of model.marks) {
    if (mark.kind === 'text') {
      expect(Number.isFinite(mark.x) && Number.isFinite(mark.y)).toBe(true);
      expect(mark.x).toBeGreaterThanOrEqual(0);
      expect(mark.x).toBeLessThan(310);
      expect(mark.y).toBeGreaterThanOrEqual(16);
      expect(mark.y).toBeLessThan(196);
    }
  }
  switch (kind(q)) {
    case 'parallelogram':
      edges(['PQ', 'QR', 'RS', 'SP', 'PT', 'TQ']);
      expectParallel(p('P'), p('Q'), p('S'), p('R'));
      expectParallel(p('P'), p('S'), p('Q'), p('R'));
      sameLength('P', 'T', 'T', 'Q');
      expectBetween(p('S'), p('T'), p('R'));
      expect(ang('P', 'S', 'R')).toBeCloseTo(given(q, 'PSR'), 7);
      expect(ang('S', 'P', 'T')).toBeCloseTo(given(q, 'SPT'), 7);
      expect(ang('S', 'R', 'Q')).toBeCloseTo(given(q, 'SRQ'), 7);
      expect(ang('T', 'Q', 'R')).toBeCloseTo(Number(expected[0]), 7);
      break;
    case 'trapezium': {
      edges(['AB', 'BC', 'CD', 'DA', 'DE', 'EC']);
      expectParallel(p('A'), p('B'), p('D'), p('C'));
      expectBetween(p('A'), p('E'), p('B'));
      sameLength('E', 'D', 'E', 'C');
      expect(ang('D', 'A', 'B')).toBeCloseTo(given(q, 'DAB'), 7);
      expect(ang('E', 'D', 'C')).toBeCloseTo(given(q, 'EDC'), 7);
      const k = Number(/Angle BCE is ([23]) times/.exec(visibleText(q))![1]);
      expect(ang('B', 'C', 'E')).toBeCloseTo(k * ang('C', 'B', 'E'), 7);
      expect(ang('A', 'D', 'E')).toBeCloseTo(Number(expected[0]), 7);
      expect(ang('B', 'C', 'E')).toBeCloseTo(Number(expected[1]), 7);
      break;
    }
    case 'square':
      edges(['AB', 'BC', 'CD', 'DA', 'BE', 'EC', 'EF', 'FG', 'GC']);
      sameLength('A', 'B', 'B', 'C');
      sameLength('A', 'B', 'C', 'D');
      sameLength('A', 'B', 'D', 'A');
      expect(ang('D', 'A', 'B')).toBeCloseTo(90, 7);
      expect(ang('A', 'B', 'C')).toBeCloseTo(90, 7);
      expect(ang('B', 'C', 'D')).toBeCloseTo(90, 7);
      sameLength('B', 'E', 'C', 'E');
      expect(p('E')[0]).toBeGreaterThan(p('A')[0]);
      expect(p('E')[0]).toBeLessThan(p('B')[0]);
      expect(p('E')[1]).toBeGreaterThan(p('A')[1]);
      expect(p('E')[1]).toBeLessThan(p('D')[1]);
      expectParallel(p('E'), p('F'), p('C'), p('G'));
      expect(ang('C', 'E', 'F')).toBeCloseTo(given(q, 'CEF'), 7);
      expect(ang('E', 'F', 'G')).toBeCloseTo(given(q, 'EFG'), 7);
      expect(360 - ang('D', 'C', 'G')).toBeCloseTo(given(q, 'DCG'), 7);
      expect(model.marks.some(m => m.kind === 'path' && m.d.includes(' A 14 14 0 1 '))).toBe(true);
      expect(ang('F', 'G', 'C')).toBeCloseTo(Number(expected[0]), 7);
      expect(ang('C', 'B', 'E')).toBeCloseTo(Number(expected[1]), 7);
      break;
  }
}

describe('parallel-line transfer into an isosceles triangle', () => {
  test('independently solves visible givens and checks diagrams across varied seeds and indices', () => {
    const seen = new Map<string, Set<string>>();
    for (const seed of seeds) for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solveVisible({prompt: q.prompt, context: q.context});
      const variant = kind(q);
      if (!seen.has(variant)) seen.set(variant, new Set());
      seen.get(variant)!.add(visibleText(q));
      expect(q.unit).toBe('degrees');
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
      expect(q.explanation).toBe(q.workedSteps!.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '));
      for (const value of expected) {
        expect(Number.isInteger(Number(value))).toBe(true);
        expect(Number(value)).toBeGreaterThan(0);
        expect(Number(value)).toBeLessThan(180);
      }
      if (variant === 'parallelogram') {
        expect(q.answer).toBe(expected[0]);
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices!.filter(value => value === expected[0])).toHaveLength(1);
        expect(q.choices!.every(value => /^\d+$/.test(value) && Number(value) > 0 && Number(value) < 180)).toBe(true);
        expect(given(q, 'PSR')).not.toBe(70);
        expect(given(q, 'SPT')).not.toBe(58);
        expect(given(q, 'SRQ')).not.toBe(110);
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse?.kind).toBe('number-pair');
        expect(JSON.parse(q.answer)).toEqual(expected);
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(expected))).toBe(true);
        const wrong = [String(Number(expected[0]) + 1), expected[1]];
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(wrong))).toBe(false);
        expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify([expected[0]]))).toBe(false);
        if (variant === 'trapezium') {
          expect(given(q, 'DAB')).not.toBe(60);
          expect(given(q, 'EDC')).not.toBe(75);
        } else {
          expect(given(q, 'DCG')).not.toBe(230);
          expect(given(q, 'EFG')).not.toBe(110);
        }
      }
      checkGeometry(q, expected);
    }
    expect([...seen.keys()].sort()).toEqual(['parallelogram', 'square', 'trapezium']);
    for (const contexts of seen.values()) expect(contexts.size).toBeGreaterThan(8);
  });

  test('is deterministic and visits all configurations in each consecutive three-question group', () => {
    for (const seed of [-101, -1, 0, 1, 2026, 2147483647]) {
      const variants = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        variants.add(kind(q));
      }
      expect(variants.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  test('declares one level-five family with supported curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('parallel-line-transfer-into-isosceles-triangle');
    const allowed = new Set(['P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03', 'P4.S.SHAPE.01']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });
});
