import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragShadedAreaSubtraction';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Solution = {answer: number; shaded: number; whole: number; variant: number};

function values(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible dimensions: ${pattern}`);
  return match.slice(1).map(Number);
}

function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i], [nextX, nextY] = points[(i + 1) % points.length];
    twiceArea += x * nextY - nextX * y;
  }
  return Math.abs(twiceArea) / 2;
}

// This solver receives only the pupil-facing prompt, context and picture.
// It reconstructs coordinates from the visible dimensions and uses polygon
// determinants, independently of the generator's worked arithmetic.
function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join(' ');
  if (text.includes('ABJM')) {
    const [side, an, cd] = values(text, /AB = (\d+) cm, AN = (\d+) cm and CD = (\d+) cm/);
    expect(text).toContain('DE, EF, FG, ML, LK and KJ have the same length');
    expect(text).toContain('A, B and F lie on one horizontal line');
    expect(text).toContain('C, B, H and J lie on one vertical line');
    expect(side % 3).toBe(0);
    expect(an).toBeGreaterThan(0);
    expect(an).toBeLessThan(side);
    expect(cd).toBeGreaterThan(0);
    const u = side / 3;
    const shaded = polygonArea([
      [0, 0], [side, 0], [side, -u], [side + cd, -u],
      [side + cd + u, 0], [side + cd + u, u], [side, u],
      [2 * u, side], [u, side], [0, an],
    ]);
    const whole = side * side + (cd + u) * 2 * u;
    return {answer: shaded, shaded, whole, variant: 0};
  }
  if (text.includes('ACDF')) {
    const [whole, height, right] = values(text, /covers (\d+) cm²\. Its height CD is (\d+) cm, and ED is (\d+) cm/);
    expect(text).toContain('AE and BF cross at O');
    expect(text).toContain('AFO and CDE');
    const left = whole / height - right;
    expect(left).toBeGreaterThan(0);
    expect(Number.isInteger(left)).toBe(true);
    const shaded = polygonArea([[0, 0], [0, height], [left / 2, height / 2]])
      + polygonArea([[left + right, 0], [left + right, height], [left, height]]);
    return {answer: shaded, shaded, whole, variant: 1};
  }
  const [width, height] = values(text, /rectangle is (\d+) cm wide and (\d+) cm high/);
  const [small, large] = values(text, /square sides are (\d+) cm and (\d+) cm/);
  expect(text).toContain('share a straight bottom edge');
  expect(text).toContain('Only triangle ACE is shaded');
  expect(q.prompt).toContain('not shaded');
  expect(width).toBeGreaterThan(0);
  expect(height).toBeGreaterThan(0);
  expect(height).toBeLessThan(small);
  expect(small).toBeLessThan(large);
  const fullWidth = width + small + large;
  // Check the upper sloping edge stays below both smaller shapes' tops.
  expect(large * width / fullWidth).toBeLessThan(height);
  expect(large * (width + small) / fullWidth).toBeLessThan(small);
  const shaded = polygonArea([[0, 0], [width + small, 0], [fullWidth, large]]);
  const whole = width * height + small * small + large * large;
  return {answer: whole - shaded, shaded, whole, variant: 2};
}

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture};
}

function pathPoints(path: string): Point[] {
  expect(path.replace(/[MLZ\s\d.eE+\-]/g, '')).toBe('');
  const numbers = (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  expect(numbers.length % 2).toBe(0);
  const points: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  expect(points.length).toBeGreaterThanOrEqual(3);
  return points;
}

const seeds = [-17, 0, 1, 2, 7, 41, 99, 2026, 2147483647];

describe('shaded area by subtracting known regions', () => {
  it('independently solves the visible givens across seeds and all three variants', () => {
    const variants = new Set<number>(), givens = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        variants.add(solved.variant);
        givens.add(JSON.stringify(q.context));
        expect(q.answer).toBe(String(solved.answer));
        expect(Number.isInteger(solved.answer)).toBe(true);
        expect(solved.answer).toBeGreaterThan(0);
        expect(solved.answer).toBeLessThan(solved.whole);
        expect(q.unit).toBe('cm²');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
      }
    }
    expect([...variants].sort()).toEqual([0, 1, 2]);
    expect(givens.size).toBeGreaterThan(24);
  });

  it('draws the correct shaded proportion with the supported picture model', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index), solved = solveVisible(visible(q));
        const picture = q.picture;
        if (!picture || picture.type !== 'batch11-upper') throw new Error('Expected the supported line-and-path diagram');
        let shadedPixels = 0, wholePixels = 0, colouredPaths = 0, outlines = 0;
        for (const mark of picture.marks) {
          if (mark.kind === 'path') {
            const points = pathPoints(mark.d);
            for (const [x, y] of points) {
              expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(320);
              expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(200);
            }
            if (mark.fill && mark.fill !== 'none') {
              shadedPixels += polygonArea(points); colouredPaths++;
            } else {
              wholePixels += polygonArea(points); outlines++;
            }
          } else if (mark.kind === 'text') {
            expect(mark.x).toBeGreaterThanOrEqual(0);
            expect(mark.x + mark.text.length * 10).toBeLessThan(320);
            expect(mark.y).toBeGreaterThanOrEqual(17);
            expect(mark.y).toBeLessThan(190);
          }
        }
        expect(wholePixels).toBeGreaterThan(0);
        expect(shadedPixels / wholePixels).toBeCloseTo(solved.shaded / solved.whole, 8);
        const expectedCounts = [[1, 2], [2, 1], [1, 3]][solved.variant];
        expect([colouredPaths, outlines]).toEqual(expectedCounts);
      }
    }
  });

  it('is reproducible and cycles through the variants as index advances', () => {
    for (const seed of seeds) {
      const seen = new Set<number>();
      for (let index = 0; index < 3; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        seen.add(solveVisible(visible(makeRagQuestion(seed, index))).variant);
      }
      expect(seen.size).toBe(3);
    }
    expect(makeRagQuestion(41)).toEqual(makeRagQuestion(41, 0));
  });

  it('declares one Primary 5 family with curriculum-supported skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('shaded-area-by-subtracting-known-regions');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.02', 'P5.S.AREA.03']);
  });
});
