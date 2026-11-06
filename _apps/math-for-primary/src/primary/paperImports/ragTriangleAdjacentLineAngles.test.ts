import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragTriangleAdjacentLineAngles';

// The independent solver receives only material shown to the pupil.
// Stored answers, hints, explanations and generation parameters are excluded.
type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'choices' | 'unit'>;
type Point = {x: number; y: number};

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture, choices: q.choices, unit: q.unit};
}
function given(v: Visible, expression: RegExp): number {
  const match = expression.exec((v.context ?? []).join(' '));
  if (!match) throw new Error(`Missing visible given: ${expression}`);
  return Number(match[1]);
}
function solveVisible(v: Visible): number {
  const wording = (v.context ?? []).join(' ');
  if (v.prompt.includes('a + b')) {
    if (!wording.includes('a is angle CAB and b is angle ABC')) throw new Error('Missing angle identities');
    const reflex = given(v, /reflex angle ACB is (\d+)°/);
    if (!(reflex > 180 && reflex < 360)) throw new Error('Invalid reflex angle');
    return 180 - (360 - reflex);
  }
  if (v.prompt.includes('BAD')) {
    if (!wording.includes('D lies between B and C')) throw new Error('Missing point order');
    const b = given(v, /Angle ABC = (\d+)°/);
    const c = given(v, /Angle ACB = (\d+)°/);
    const part = given(v, /Angle DAC = (\d+)°/);
    // Use the whole triangle, independently of the generator's route via D.
    const wholeA = 180 - b - c;
    if (!(part > 0 && part < wholeA)) throw new Error('Invalid split');
    return wholeA - part;
  }
  if (v.prompt.includes('ODC')) {
    if (!wording.includes('AB = AO') || !wording.includes('A, O and D') || !wording.includes('B, O and C')) {
      throw new Error('Missing equality or crossing relationships');
    }
    const b = given(v, /Angle ABO = (\d+)°/);
    const c = given(v, /Angle OCD = (\d+)°/);
    // Equal sides determine the left angle at O; opposite angles transfer it.
    const possible = Array.from({length: 179}, (_, i) => i + 1).filter(x => x + b + c === 180);
    if (possible.length !== 1 || 180 - 2 * b <= 0) throw new Error('Invalid triangles');
    return possible[0];
  }
  throw new Error('Unknown visible task');
}
function drawing(v: Visible) {
  if (!v.picture || v.picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  return v.picture;
}
function position(v: Visible, name: string): Point {
  const marks = drawing(v).marks;
  const label = marks.find(m => m.kind === 'text' && m.text === name);
  if (!label || label.kind !== 'text') throw new Error(`Missing vertex ${name}`);
  // Match visible vertex letters to the nearest structural line endpoint.
  // Short equal-side ticks are excluded.
  const endpoints: Point[] = marks.flatMap(m => m.kind === 'line' && Math.hypot(m.x2 - m.x1, m.y2 - m.y1) > 35
    ? [{x: m.x1, y: m.y1}, {x: m.x2, y: m.y2}] : []);
  if (!endpoints.length) throw new Error('Missing edges');
  const distance = (p: Point) => Math.hypot(p.x - label.x, p.y - label.y);
  return endpoints.reduce((nearest, p) => distance(p) < distance(nearest) ? p : nearest);
}
function length(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function angle(v: Visible, first: string, centre: string, last: string): number {
  const a = position(v, first), o = position(v, centre), b = position(v, last);
  const denominator = length(a, o) * length(b, o);
  if (denominator <= 0) throw new Error('Degenerate angle');
  const cosine = ((a.x - o.x) * (b.x - o.x) + (a.y - o.y) * (b.y - o.y)) / denominator;
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
function checkBetween(v: Visible, first: string, middle: string, last: string): void {
  const a = position(v, first), m = position(v, middle), b = position(v, last);
  const dx = b.x - a.x, dy = b.y - a.y;
  expect((m.x - a.x) * dy - (m.y - a.y) * dx).toBeCloseTo(0, 7);
  const fraction = ((m.x - a.x) * dx + (m.y - a.y) * dy) / (dx * dx + dy * dy);
  expect(fraction).toBeGreaterThan(0);
  expect(fraction).toBeLessThan(1);
}
function checkDiagram(v: Visible, solution: number): void {
  const picture = drawing(v);
  for (const mark of picture.marks) {
    const coordinates = mark.kind === 'line' ? [[mark.x1, mark.y1], [mark.x2, mark.y2]]
      : mark.kind === 'text' ? [[mark.x, mark.y]] : [];
    for (const [x, y] of coordinates) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(210);
    }
    if (mark.kind === 'path') expect(mark.d).not.toMatch(/NaN|Infinity/);
  }
  if (v.prompt.includes('a + b')) {
    const reflex = given(v, /reflex angle ACB is (\d+)°/);
    expect(angle(v, 'A', 'C', 'B')).toBeCloseTo(360 - reflex, 7);
    expect(angle(v, 'C', 'A', 'B') + angle(v, 'A', 'B', 'C')).toBeCloseTo(solution, 7);
    expect(picture.marks.some(m => m.kind === 'path' && m.d.includes('A 24 24 0 1 0'))).toBe(true);
    for (const name of ['a', 'b', `${reflex}°`]) {
      expect(picture.marks.some(m => m.kind === 'text' && m.text === name)).toBe(true);
    }
  } else if (v.prompt.includes('BAD')) {
    checkBetween(v, 'B', 'D', 'C');
    expect(angle(v, 'A', 'B', 'C')).toBeCloseTo(given(v, /Angle ABC = (\d+)°/), 7);
    expect(angle(v, 'A', 'C', 'B')).toBeCloseTo(given(v, /Angle ACB = (\d+)°/), 7);
    expect(angle(v, 'D', 'A', 'C')).toBeCloseTo(given(v, /Angle DAC = (\d+)°/), 7);
    expect(angle(v, 'B', 'A', 'D')).toBeCloseTo(solution, 7);
  } else {
    checkBetween(v, 'A', 'O', 'D');
    checkBetween(v, 'B', 'O', 'C');
    const a = position(v, 'A'), b = position(v, 'B'), o = position(v, 'O');
    expect(length(a, b)).toBeCloseTo(length(a, o), 7);
    expect(angle(v, 'A', 'B', 'O')).toBeCloseTo(given(v, /Angle ABO = (\d+)°/), 7);
    expect(angle(v, 'O', 'C', 'D')).toBeCloseTo(given(v, /Angle OCD = (\d+)°/), 7);
    expect(angle(v, 'A', 'O', 'B')).toBeCloseTo(angle(v, 'C', 'O', 'D'), 7);
    expect(angle(v, 'O', 'D', 'C')).toBeCloseTo(solution, 7);
    const ticks = picture.marks.filter(m => m.kind === 'line' && Math.abs(Math.hypot(m.x2 - m.x1, m.y2 - m.y1) - 10) < 1e-7);
    expect(ticks).toHaveLength(2);
  }
}

describe('triangle and adjacent-line angle chase', () => {
  it('checks the visible-givens solver against independently specified examples', () => {
    expect(solveVisible({prompt: 'Find a + b.', context: ['a is angle CAB and b is angle ABC. The reflex angle ACB is 314°.']})).toBe(134);
    expect(solveVisible({prompt: 'Find BAD.', context: ['D lies between B and C. Angle ABC = 47°. Angle ACB = 34°. Angle DAC = 51°.']})).toBe(48);
    expect(solveVisible({prompt: 'Find ODC.', context: ['A, O and D are collinear; B, O and C are collinear. AB = AO. Angle ABO = 63°. Angle OCD = 53°.']})).toBe(64);
  });

  it('independently solves visible givens and checks diagrams across varied seeds and indices', () => {
    const prompts = new Set<string>();
    const contexts = new Set<string>();
    const seeds = [...Array.from({length: 60}, (_, i) => i - 20), 2147483647, -2147483648, Number.MAX_SAFE_INTEGER];
    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const v = visible(q);
        const solution = solveVisible(v);
        expect(Number.isInteger(solution)).toBe(true);
        expect(solution).toBeGreaterThan(0);
        expect(solution).toBeLessThan(180);
        expect(q.answer).toBe(String(solution));
        expect(v.unit).toBe('degrees');
        checkDiagram(v, solution);
        if (v.prompt.includes('BAD')) {
          expect(v.choices).toBeUndefined();
        } else {
          expect(v.choices).toHaveLength(4);
          expect(new Set(v.choices).size).toBe(4);
          expect(v.choices?.filter(choice => choice === String(solution))).toHaveLength(1);
          for (const choice of v.choices ?? []) {
            expect(Number.isInteger(Number(choice))).toBe(true);
            expect(Number(choice)).toBeGreaterThan(0);
            expect(Number(choice)).toBeLessThan(180);
          }
        }
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));
        expect(q.hint.length).toBeGreaterThan(20);
        prompts.add(v.prompt);
        contexts.add((v.context ?? []).join(' '));
      }
    }
    expect(prompts.size).toBe(3);
    expect(contexts.size).toBeGreaterThan(20);
  });

  it('is deterministic and uses the index to select different tasks', () => {
    for (const seed of [0, 1, -7, 91, Number.MAX_SAFE_INTEGER]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 5)).toEqual(makeRagQuestion(seed, 5));
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.prompt)).size).toBe(3);
      expect(new Set(questions.map(q => q.key)).size).toBe(3);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('triangle-and-adjacent-line-angle-chase');
  });
});
