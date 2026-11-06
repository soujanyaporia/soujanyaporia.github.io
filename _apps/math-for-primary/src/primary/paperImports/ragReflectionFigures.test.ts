import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragReflectionFigures';

type Point = [number, number];
type Segment = [Point, Point];
type Figure = {letter: string; segments: Segment[]};
type VisibleQuestion = Pick<Question, 'prompt' | 'picture' | 'context' | 'choices' | 'structuredResponse'>;
const EPS = 1e-6;
const near = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS;
const lengthSquared = ([x, y]: Point) => x * x + y * y;

/** Infer every reflection axis from visible segment geometry, without template names or expected answers. */
function countAxes(segments: Segment[]): number {
  const vertices: Point[] = [];
  for (const point of segments.flat()) {
    if (!vertices.some(other => near(point, other))) vertices.push(point);
  }
  if (vertices.length < 3) throw new Error('A complete figure is required');
  const centre: Point = [
    vertices.reduce((sum, p) => sum + p[0], 0) / vertices.length,
    vertices.reduce((sum, p) => sum + p[1], 0) / vertices.length,
  ];
  const origin = vertices.find(p => !near(p, centre));
  if (!origin) throw new Error('Degenerate figure');
  const u: Point = [origin[0] - centre[0], origin[1] - centre[1]];
  const validAngles: number[] = [];

  // A reflection preserves the centroid of the endpoint set. It must map this
  // non-central endpoint to an endpoint at the same distance from that centroid.
  for (const destination of vertices) {
    const v: Point = [destination[0] - centre[0], destination[1] - centre[1]];
    if (Math.abs(lengthSquared(u) - lengthSquared(v)) > EPS) continue;
    let direction: Point = [u[0] + v[0], u[1] + v[1]];
    if (lengthSquared(direction) < EPS * EPS) direction = [-u[1], u[0]];
    const denominator = lengthSquared(direction);
    if (denominator < EPS * EPS) continue;
    const angle = (Math.atan2(direction[1], direction[0]) + Math.PI) % Math.PI;
    if (validAngles.some(a => Math.abs(Math.sin(a - angle)) < EPS)) continue;

    const reflect = ([x, y]: Point): Point => {
      const dx = x - centre[0];
      const dy = y - centre[1];
      const factor = 2 * (dx * direction[0] + dy * direction[1]) / denominator;
      return [centre[0] + factor * direction[0] - dx, centre[1] + factor * direction[1] - dy];
    };
    const used = new Set<number>();
    const matches = segments.every(([a, b]) => {
      const ra = reflect(a);
      const rb = reflect(b);
      const at = segments.findIndex(([c, d], i) => !used.has(i) && (
        (near(ra, c) && near(rb, d)) || (near(ra, d) && near(rb, c))
      ));
      if (at < 0) return false;
      used.add(at);
      return true;
    });
    if (matches) validAngles.push(angle);
  }
  return validAngles.length;
}

function readVisibleFigures(picture: Question['picture']): Figure[] {
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const segments: Segment[] = [];
  const labels: {text: string; x: number; y: number}[] = [];
  for (const mark of picture.marks) {
    if (mark.kind === 'line') segments.push([[mark.x1, mark.y1], [mark.x2, mark.y2]]);
    else if (mark.kind === 'text' && /^[A-D]$/.test(mark.text)) labels.push(mark);
    else throw new Error('Unexpected mathematical mark');
  }
  if (labels.length !== 4 || new Set(labels.map(l => l.text)).size !== 4) {
    throw new Error('Four distinct figure labels are required');
  }
  labels.sort((a, b) => a.y - b.y || a.x - b.x);
  const points = segments.flat();
  if (!points.length) throw new Error('Empty diagram');
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const splitX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const splitY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const cell = ([x, y]: Point) => (y < splitY ? 0 : 2) + (x < splitX ? 0 : 1);
  const figures: Figure[] = labels.map(label => ({letter: label.text, segments: []}));
  for (const segment of segments) {
    const bucket = cell(segment[0]);
    if (cell(segment[1]) !== bucket) throw new Error('Figures overlap their diagram cells');
    figures[bucket].segments.push(segment);
  }
  if (figures.some(figure => figure.segments.length < 3)) throw new Error('Incomplete outline');
  return figures;
}

function solveVisible(q: VisibleQuestion): {answer: string; mode: string; counts: number[]; target?: number} {
  const figures = readVisibleFigures(q.picture);
  const counts = figures.map(figure => countAxes(figure.segments));
  if (/no lines of symmetry/.test(q.prompt)) {
    const matches = figures.filter((_, i) => counts[i] === 0);
    if (matches.length !== 1) throw new Error('Negative selection must have one answer');
    return {answer: matches[0].letter, mode: 'none', counts};
  }
  const pair = /two figures.*exactly (\d+) lines? of symmetry/.exec(q.prompt);
  if (pair) {
    const target = Number(pair[1]);
    const matches = figures.filter((_, i) => counts[i] === target).map(f => f.letter).sort();
    if (matches.length !== 2) throw new Error('Pair selection must have exactly two answers');
    return {answer: JSON.stringify(matches), mode: 'pair', counts, target};
  }
  if (/How many.*at least one line of symmetry/.test(q.prompt)) {
    return {answer: String(counts.filter(n => n > 0).length), mode: 'count', counts};
  }
  throw new Error('Unrecognised visible task');
}

function boundary(points: Point[]): Segment[] {
  return points.map((point, i) => [point, points[(i + 1) % points.length]]);
}

function rotateFixture(segments: Segment[]): Segment[] {
  const angle = Math.PI / 7;
  const convert = ([x, y]: Point): Point => [
    27 + x * Math.cos(angle) - y * Math.sin(angle),
    43 + x * Math.sin(angle) + y * Math.cos(angle),
  ];
  return segments.map(([a, b]) => [convert(a), convert(b)]);
}

describe('reflection-figure candidate', () => {
  it('calibrates the independent solver with oblique axes and symmetry-breaking internal lines', () => {
    const rectangle = boundary([[-5, -2], [5, -2], [5, 2], [-5, 2]]);
    const markedOnce: Segment[] = [...rectangle, [[1, -2], [1, 2]]];
    const markedTwice: Segment[] = [...markedOnce, [[-5, 1], [5, 1]]];
    const fixtures: {segments: Segment[]; expected: number}[] = [
      {segments: boundary([[0, 0], [8, 0], [0, 6]]), expected: 0},
      {segments: boundary([[-2, 0], [2, 0], [0, 3]]), expected: 1},
      {segments: rectangle, expected: 2},
      {segments: boundary([[-2, -2], [2, -2], [2, 2], [-2, 2]]), expected: 4},
      {segments: markedOnce, expected: 1},
      {segments: markedTwice, expected: 0},
    ];
    for (const fixture of fixtures) {
      expect(countAxes(fixture.segments)).toBe(fixture.expected);
      expect(countAxes(rotateFixture(fixture.segments))).toBe(fixture.expected);
    }
  });

  it('solves visible diagrams across varied seeds and indices and checks response constraints', () => {
    const modes = new Set<string>();
    const axisCounts = new Set<number>();
    const targets = new Set<number>();
    const totals = new Set<number>();
    const seeds = [-2147483648, -101, -1, ...Array.from({length: 96}, (_, i) => i), 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        // Only fields visible to the pupil enter the solver. Neither the
        // stored answer nor the explanation nor generation metadata is passed.
        const visible: VisibleQuestion = {
          prompt: q.prompt,
          picture: q.picture,
          context: q.context,
          choices: q.choices,
          structuredResponse: q.structuredResponse,
        };
        const solved = solveVisible(visible);
        expect(q.answer).toBe(solved.answer);
        modes.add(solved.mode);
        solved.counts.forEach(n => axisCounts.add(n));
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        if (solved.mode === 'pair') {
          targets.add(solved.target!);
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'named-pair') throw new Error('Missing pair control');
          expect(q.choices).toBeUndefined();
          const correct = JSON.parse(solved.answer) as string[];
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...correct].reverse()))).toBe(true);
          const other = spec.options.find(label => !correct.includes(label));
          expect(other).toBeDefined();
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([correct[0], other]))).toBe(false);
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(value => value === solved.answer)).toHaveLength(1);
        }
        if (solved.mode === 'count') {
          totals.add(Number(solved.answer));
          expect(Number(solved.answer)).toBeGreaterThanOrEqual(1);
          expect(Number(solved.answer)).toBeLessThanOrEqual(3);
          expect(q.unit).toBe('figures');
        }
        for (const figure of readVisibleFigures(q.picture)) {
          for (const [x, y] of figure.segments.flat()) {
            expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
            expect(x).toBeGreaterThan(10);
            expect(x).toBeLessThan(310);
            expect(y).toBeGreaterThan(10);
            expect(y).toBeLessThan(200);
          }
        }
      }
    }
    expect([...modes].sort()).toEqual(['count', 'none', 'pair']);
    expect([...axisCounts].sort((a, b) => a - b)).toEqual([0, 1, 2, 4]);
    expect([...targets].sort()).toEqual([1, 2]);
    expect([...totals].sort()).toEqual([1, 2, 3]);
  });

  it('reproduces each question and varies visible questions across indices', () => {
    const signatures = new Set<string>();
    for (let index = 0; index < 20; index++) {
      const first = makeRagQuestion(731, index);
      expect(makeRagQuestion(731, index)).toEqual(first);
      signatures.add(JSON.stringify([first.prompt, first.picture]));
    }
    expect(signatures.size).toBeGreaterThan(10);
  });
});
