import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragP5GridLineChoice';

type Point = [number, number];
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];

// Read the rendered points and their nearby letters, not the answer, explanation,
// accessibility description, random stream or generation parameters.
function readDiagram(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const marks = q.picture.marks;
  const dots = marks.filter(m => m.kind === 'circle' && m.r >= 2);
  const labels = marks.filter(m => m.kind === 'text');
  expect(dots).toHaveLength(7);
  expect(labels).toHaveLength(7);
  const points = new Map<string, Point>();
  for (const label of labels) {
    if (label.kind !== 'text') throw new Error('Expected a letter');
    // Approximate the centre of the displayed 17px letter, then find its dot.
    const centre: Point = [label.x + 5, label.y - 6];
    const nearest = dots.map(dot => {
      if (dot.kind !== 'circle') throw new Error('Expected a point');
      return { point: [dot.cx, dot.cy] as Point,
        distance: Math.hypot(dot.cx - centre[0], dot.cy - centre[1]) };
    }).sort((a, b) => a.distance - b.distance);
    expect(nearest[0].distance).toBeLessThan(nearest[1].distance);
    expect(nearest[0].distance).toBeLessThan(12);
    points.set(label.text, nearest[0].point);
  }
  expect(points.size).toBe(7);
  expect(new Set([...points.values()].map(p => p.join(','))).size).toBe(7);
  const match = /parallel to ([A-Z]{2})/.exec(q.prompt);
  if (!match) throw new Error('Reference line is not visible in the prompt');
  const get = (name: string): Point => {
    const point = points.get(name);
    if (!point) throw new Error(`Missing displayed point ${name}`);
    return point;
  };
  const a = get(match[1][0]), b = get(match[1][1]);
  const drawn = marks.filter(m => m.kind === 'line');
  expect(drawn).toHaveLength(1);
  if (drawn[0].kind !== 'line') throw new Error('Missing reference segment');
  expect([drawn[0].x1, drawn[0].y1]).toEqual(a);
  expect([drawn[0].x2, drawn[0].y2]).toEqual(b);
  return { get, a, b, marks };
}

function solveVisible(q: Question): string[] {
  const { get, a, b } = readDiagram(q);
  const reference = subtract(b, a);
  if (!q.choices) throw new Error('Missing choices');
  return q.choices.filter(choice => {
    if (!/^[A-Z]{2}$/.test(choice)) throw new Error('Invalid line name');
    const start = get(choice[0]), end = get(choice[1]);
    const direction = subtract(end, start);
    // Equal directions alone are insufficient: exclude the same supporting line.
    return Math.hypot(...direction) > 0
      && cross(reference, direction) === 0
      && cross(reference, subtract(start, a)) !== 0;
  });
}

test('visible geometry gives exactly one offered answer across varied seeds and indices', () => {
  const directions = new Set<string>();
  const answerSlots = new Set<number>();
  for (let seed = -8; seed < 72; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      const solved = solveVisible(q);
      expect(solved).toHaveLength(1);
      expect(q.answer).toBe(solved[0]);
      answerSlots.add(q.choices!.indexOf(solved[0]));
      const { a, b, marks } = readDiagram(q);
      const [dx, dy] = subtract(b, a);
      directions.add(`${Math.sign(dx)},${Math.sign(dy)}`);
      const grid = marks.filter(m => m.kind === 'circle' && m.r < 1);
      const xs = [...new Set(grid.flatMap(m => m.kind === 'circle' ? [m.cx] : []))].sort((x, y) => x - y);
      const ys = [...new Set(grid.flatMap(m => m.kind === 'circle' ? [m.cy] : []))].sort((x, y) => x - y);
      const cell = xs[1] - xs[0];
      expect(cell).toBeGreaterThan(0);
      expect(xs.slice(1).every((x, i) => x - xs[i] === cell)).toBe(true);
      expect(ys.slice(1).every((y, i) => y - ys[i] === cell)).toBe(true);
      expect(q.workedSteps?.[0].text).toContain(`${Math.abs(dx) / cell} spaces`);
      expect(q.workedSteps?.[0].text).toContain(`${Math.abs(dy) / cell} space`);
      for (const mark of marks) {
        if (mark.kind === 'circle') {
          expect(mark.cx - mark.r).toBeGreaterThanOrEqual(0);
          expect(mark.cx + mark.r).toBeLessThanOrEqual(320);
          expect(mark.cy - mark.r).toBeGreaterThanOrEqual(0);
          expect(mark.cy + mark.r).toBeLessThanOrEqual(200);
        }
        if (mark.kind === 'text') {
          expect(mark.x).toBeGreaterThanOrEqual(0);
          expect(mark.x + 13).toBeLessThanOrEqual(320);
          expect(mark.y - 17).toBeGreaterThanOrEqual(0);
          expect(mark.y).toBeLessThanOrEqual(200);
        }
      }
      expect(q.unit).toBeUndefined();
    }
  }
  expect(directions.size).toBe(4);
  expect(answerSlots.size).toBe(4);
});

test('the solver follows changed visible endpoint labels rather than the stored answer', () => {
  for (const seed of [4, 19, 82]) {
    const q = makeRagQuestion(seed);
    const correct = solveVisible(q)[0];
    const other = q.choices!.find(choice => choice !== correct)!;
    const changed = structuredClone(q);
    if (changed.picture?.type !== 'batch11-upper') throw new Error('Missing diagram');
    for (const mark of changed.picture.marks) {
      if (mark.kind !== 'text') continue;
      if (mark.text === correct[1]) mark.text = other[1];
      else if (mark.text === other[1]) mark.text = correct[1];
    }
    expect(solveVisible(changed)).toEqual([other]);
    expect(changed.answer).toBe(q.answer);
  }
});

test('generation is reproducible and metadata identifies the scoped P5 family', () => {
  expect(makeRagQuestion(57)).toEqual(makeRagQuestion(57, 0));
  expect(makeRagQuestion(57, 3)).toEqual(makeRagQuestion(57, 3));
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-identify-parallel-and-perpendicular-relationships');
  expect(RAG_PATTERN.skillIds).toEqual(['P3.S.LINES.01']);
  expect(new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(makeRagQuestion(57, i).picture))).size).toBeGreaterThan(1);
});
