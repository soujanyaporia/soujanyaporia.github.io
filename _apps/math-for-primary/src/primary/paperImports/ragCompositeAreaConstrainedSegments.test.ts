import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragCompositeAreaConstrainedSegments';

type Point = [number, number];
type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;

function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = points[(i + 1) % points.length];
    return sum + x * nextY - y * nextX;
  }, 0)) / 2;
}

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens: ${pattern}`);
  return match.slice(1).map(Number);
}

// This solver receives only pupil-visible prose, never answers, worked steps,
// RNG state or private generator parameters. It uses complementary areas for
// the first two variants and coordinates for the centre variant.
function solveVisible(q: VisibleQuestion) {
  const text = [q.prompt, ...(q.context ?? [])].join(' ');
  if (text.includes('F is the midpoint of DC')) {
    const [w, h, ae] = readNumbers(text, /AB = (\d+) cm, BC = (\d+) cm and AE = (\d+) cm/);
    if (!(w > 0 && h > 0 && ae > 0 && ae < w / 2)) throw new Error('Invalid partition');
    const rectangleArea = w * h;
    return {
      kind: 'midpoint', rectangleArea,
      area: rectangleArea - ae * h / 2 - (w / 2) * h / 2,
      labels: ['A', 'B', 'C', 'D', 'E', 'F'],
    };
  }
  if (text.includes('Square ABEF')) {
    const [length, bg] = readNumbers(text, /ED = (\d+) cm and BG = (\d+) cm/);
    const [n, d] = readNumbers(text, /AB = (\d+)\/(\d+) of ED/);
    if (!(n > 0 && n < d && bg > 0 && bg < length)) throw new Error('Invalid side relationship');
    const side = length * n / d;
    const rectangleArea = (side + length) * side;
    // The unshaded pieces are AED and GCD.
    return {
      kind: 'side-fraction', rectangleArea,
      area: rectangleArea - length * side / 2 - (length - bg) * side / 2,
      labels: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    };
  }
  if (text.includes('O is the centre')) {
    const [w, h] = readNumbers(text, /BC = (\d+) cm and AB = (\d+) cm/);
    const [eDen, fDen] = readNumbers(text, /AE = 1\/(\d+) of AD and DF = 1\/(\d+) of DC/);
    if (!(w > 0 && h > 0 && eDen > 2 && fDen > 2)) throw new Error('Invalid centre partition');
    const E: Point = [w / eDen, 0], F: Point = [w, h / fDen], O: Point = [w / 2, h / 2];
    return {
      kind: 'centre', rectangleArea: w * h,
      area: polygonArea([E, F, O]),
      labels: ['A', 'B', 'C', 'D', 'E', 'F', 'O'],
    };
  }
  throw new Error('Unrecognised visible question');
}

function drawnArea(path: string): number {
  const numbers = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
  if (numbers.length < 6 || numbers.length % 2) throw new Error('Invalid polygon path');
  const points: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) points.push([numbers[i], numbers[i + 1]]);
  return polygonArea(points);
}

describe('composite area from constrained segments', () => {
  it('checks the independent solver against three explicit visible constructions', () => {
    expect(solveVisible({prompt: '', context: [
      'F is the midpoint of DC. AB = 28 cm, BC = 16 cm and AE = 10 cm.',
    ]}).area).toBe(256);
    expect(solveVisible({prompt: '', context: [
      'Square ABEF. ED = 40 cm and BG = 16 cm. AB = 3/5 of ED.',
    ]}).area).toBe(768);
    expect(solveVisible({prompt: '', context: [
      'O is the centre. BC = 72 cm and AB = 30 cm. AE = 1/3 of AD and DF = 1/5 of DC.',
    ]}).area).toBe(324);
  });

  it('independently solves visible givens and checks the shaded geometry across varied seeds', () => {
    const seeds = [...Array.from({length: 72}, (_, i) => i - 36), 2147483647, 4294967295, Number.MAX_SAFE_INTEGER];
    const kinds = new Set<string>();
    const visibleInstances = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        kinds.add(solved.kind);
        visibleInstances.add(JSON.stringify([q.prompt, q.context]));
        expect(Number(q.answer)).toBeCloseTo(solved.area, 9);
        expect(Number.isInteger(solved.area)).toBe(true);
        expect(solved.area).toBeGreaterThan(0);
        expect(solved.area).toBeLessThan(solved.rectangleArea);
        expect(q.unit).toBe('cm²');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(makeRagQuestion(seed, index)).toEqual(q);

        const picture = q.picture;
        if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
        const paths = picture.marks.flatMap(mark => mark.kind === 'path' ? [mark] : []);
        const outlines = paths.filter(path => !path.fill || path.fill === 'none');
        const shaded = paths.filter(path => path.fill && path.fill !== 'none');
        expect(outlines).toHaveLength(1);
        expect(shaded).toHaveLength(solved.kind === 'centre' ? 1 : 2);
        const fractionShown = shaded.reduce((sum, path) => sum + drawnArea(path.d), 0) / drawnArea(outlines[0].d);
        expect(fractionShown).toBeCloseTo(solved.area / solved.rectangleArea, 9);
        const labels = picture.marks.flatMap(mark => mark.kind === 'text' ? [mark] : []);
        expect(labels.map(label => label.text).sort()).toEqual([...solved.labels].sort());
        for (const label of labels) {
          expect(label.x).toBeGreaterThanOrEqual(0);
          expect(label.x).toBeLessThan(300);
          expect(label.y).toBeGreaterThan(17);
          expect(label.y).toBeLessThan(190);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['centre', 'midpoint', 'side-fraction']);
    expect(visibleInstances.size).toBeGreaterThan(50);
  });

  it('uses index to select different visible structures reproducibly', () => {
    for (const seed of [0, 7, -19, 123456]) {
      const kinds = [0, 1, 2].map(index => solveVisible(makeRagQuestion(seed, index)).kind);
      expect(new Set(kinds).size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
