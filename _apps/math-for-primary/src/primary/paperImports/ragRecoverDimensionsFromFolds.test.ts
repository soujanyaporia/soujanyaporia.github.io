import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRecoverDimensionsFromFolds';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error('Missing visible length: ' + pattern);
  return Number(match[1]);
}

// Reflect a point across a line using projection, independently of the generator.
function reflect(p: Point, a: Point, b: Point): Point {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  return [2 * (a[0] + t * dx) - p[0], 2 * (a[1] + t * dy) - p[1]];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

// This solver cannot access the answer, worked steps, seed or generation parameters.
function solveVisible(q: Visible) {
  const text = q.context?.join(' ') ?? '';
  const width = read(text, /The strip is (\d+) cm wide throughout/);
  expect(width).toBeGreaterThan(0);
  if (text.includes('Before folding, A marked the midpoint')) {
    expect(text).toContain('below the dashed horizontal line is a square');
    expect(text).toContain('C is the end of the long edge that was folded');
    const midpoint: Point = [0, 0];
    const originalEnd = reflect([0, 2 * width], midpoint, [-width, width]);
    return {kind: 'midpoint', width, answer: 2 * distance(midpoint, originalEnd) * width};
  }
  if (text.includes('Both ends')) {
    const middle = read(text, /straight middle part is (\d+) cm long/);
    const left = read(text, /outer edge on the left is (\d+) cm long/);
    const right = read(text, /outer edge on the right is (\d+) cm long/);
    expect(Math.min(middle, left, right)).toBeGreaterThan(0);
    expect(text).toContain('Each fold turns the strip through a right angle');
    const originalLeft = reflect([0, width + left], [-width, width], [0, 0]);
    const originalRight = reflect([middle + width, -right], [middle, width], [middle + width, 0]);
    expect(originalLeft[1]).toBeCloseTo(originalRight[1], 10);
    return {kind: 'two', width, answer: distance(originalLeft, originalRight) * width};
  }
  expect(text).toContain('One end');
  const left = read(text, /straight left-hand part is (\d+) cm long/);
  const upright = read(text, /straight upright part is (\d+) cm long/);
  expect(left).toBe(width);
  expect(upright).toBeGreaterThan(0);
  const originalRight = reflect([width, -upright], [0, width], [width, 0]);
  return {kind: 'one', width, answer: distance([-left, 0], originalRight) * width};
}

function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p[0] * next[1] - p[1] * next[0];
  }, 0)) / 2;
}

// A second check reads rendered outline coordinates. Add the hidden second layer
// of each overlap to the visible silhouette, then convert using the labelled width.
function areaFromDiagram(q: Visible, solution: ReturnType<typeof solveVisible>) {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported fold diagram');
  const outlines = picture.marks.filter(mark => mark.kind === 'path' && mark.fill === '#ffffff');
  expect(outlines).toHaveLength(1);
  const outline = outlines[0];
  if (outline.kind !== 'path') throw new Error('Expected a polygon path');
  const values = (outline.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  expect(values.length % 2).toBe(0);
  const points: Point[] = [];
  for (let i = 0; i < values.length; i += 2) points.push([values[i], values[i + 1]]);
  for (const [x, y] of points) {
    expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
    expect(x).toBeGreaterThanOrEqual(80);
    expect(x).toBeLessThanOrEqual(240);
    expect(y).toBeGreaterThanOrEqual(38);
    expect(y).toBeLessThanOrEqual(142);
  }
  let scale: number;
  let covered: number;
  if (solution.kind === 'two') {
    expect(points).toHaveLength(10);
    scale = distance(points[8], points[9]) / solution.width;
    covered = polygonArea([points[0], points[1], points[7]])
      + polygonArea([points[2], points[5], points[6]]);
    expect(distance(points[2], points[5])).toBeCloseTo(solution.width * scale, 8);
    expect(distance(points[0], points[7])).toBeCloseTo(solution.width * scale, 8);
  } else if (solution.kind === 'one') {
    expect(points).toHaveLength(7);
    scale = distance(points[2], points[3]) / solution.width;
    covered = polygonArea([points[1], points[4], points[5]]);
    expect(distance(points[5], points[6])).toBeCloseTo(solution.width * scale, 8);
  } else {
    expect(points).toHaveLength(7);
    scale = distance(points[5], points[6]) / solution.width;
    covered = polygonArea([points[0], points[1], points[4]]);
    expect(distance(points[4], points[5])).toBeCloseTo(solution.width * scale, 8);
    expect(distance(points[1], points[5])).toBeCloseTo(distance(points[1], points[2]), 8);
    const letters = picture.marks.filter(mark => mark.kind === 'text').map(mark => mark.text);
    expect(letters).toEqual(expect.arrayContaining(['A', 'B', 'C']));
  }
  expect(scale).toBeGreaterThan(0);
  for (const mark of picture.marks) {
    if (mark.kind === 'text') {
      expect(mark.x).toBeGreaterThanOrEqual(0);
      expect(mark.x).toBeLessThan(285);
      expect(mark.y).toBeGreaterThan(0);
      expect(mark.y).toBeLessThan(200);
    }
  }
  return (polygonArea(points) + covered) / (scale * scale);
}

describe('recover dimensions from folds', () => {
  it('independently unfolds all three variants across varied seeds', () => {
    const variants = new Set<string>();
    const questions = new Set<string>();
    const seeds = [-2147483648, -7, 0, 1, 4294967295, ...Array.from({length: 100}, (_, i) => i * 7919)];
    for (const seed of seeds) {
      const perSeed = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const visible: Visible = {prompt: q.prompt, context: q.context, picture: q.picture};
        const solution = solveVisible(visible);
        variants.add(solution.kind);
        perSeed.add(solution.kind);
        questions.add(JSON.stringify(q.context));
        expect(Number(q.answer)).toBeCloseTo(solution.answer, 8);
        expect(areaFromDiagram(visible, solution)).toBeCloseTo(solution.answer, 7);
        expect(Number.isSafeInteger(Number(q.answer))).toBe(true);
        expect(Number(q.answer)).toBeGreaterThan(0);
        expect(Number(q.answer)).toBeLessThan(1000);
        expect(q.unit).toBe('cm²');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(20);
      }
      expect(perSeed.size).toBe(3);
    }
    expect([...variants].sort()).toEqual(['midpoint', 'one', 'two']);
    expect(questions.size).toBeGreaterThan(50);
  });

  it('reproduces questions and supports the default index', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-recover-dimensions-from-folds');
    for (const seed of [-91, 0, 39, 9001]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [-3, -1, 0, 4, 11]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
  });
});
