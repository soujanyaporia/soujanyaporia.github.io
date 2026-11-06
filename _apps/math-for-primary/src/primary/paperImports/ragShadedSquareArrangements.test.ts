import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Question} from '../generate';
import {Batch11UpperDiagram} from './Batch11UpperDiagram';
import {makeRagQuestion, RAG_PATTERN} from './ragShadedSquareArrangements';

type Point = [number, number];
type Polygon = Point[];
// Independent coordinate construction from the learner's text; no generator helpers.
function visibleGeometry(q: Pick<Question, 'context'>) {
  const text = q.context?.[0] ?? '';
  const nested = /^The outer square has side (\d+) cm\.$/.exec(text);
  if (nested) {
    const s = Number(nested[1]), h = s / 2, t = s / 4;
    const outlines: Polygon[] = [
      [[0, 0], [s, 0], [s, s], [0, s]],
      [[h, s], [s, h], [h, 0], [0, h]],
      [[t, t], [3 * t, t], [3 * t, 3 * t], [t, 3 * t]],
    ];
    const shaded: Polygon[] = [
      [[h, s], [t, 3 * t], [3 * t, 3 * t]],
      [[s, h], [3 * t, 3 * t], [3 * t, t]],
      [[h, 0], [3 * t, t], [t, t]],
      [[0, h], [t, t], [t, 3 * t]],
    ];
    return {kind: 'midpoints', sides: [s], firstSide: s, outlines, shaded};
  }
  const pair = /^The left square has side (\d+) cm\. The right square has side (\d+) cm\.$/.exec(text);
  if (pair) {
    const a = Number(pair[1]), b = Number(pair[2]);
    const outlines: Polygon[] = [
      [[0, 0], [a, 0], [a, a], [0, a]],
      [[a, 0], [a + b, 0], [a + b, b], [a, b]],
    ];
    const shaded: Polygon[] = [[[0, a], [a, 0], [a + b, 0]]];
    return {kind: 'two-squares', sides: [a, b], firstSide: a, outlines, shaded};
  }
  const triple = /^The left, middle and right squares have sides (\d+) cm, (\d+) cm and (\d+) cm, respectively\.$/.exec(text);
  if (!triple) throw Error('Unrecognised visible square dimensions');
  const [a, b, c] = triple.slice(1).map(Number);
  const outlines: Polygon[] = [
    [[0, 0], [a, 0], [a, a], [0, a]],
    [[a, 0], [a + b, 0], [a + b, b], [a, b]],
    [[a + b, 0], [a + b + c, 0], [a + b + c, c], [a + b, c]],
  ];
  const shaded: Polygon[] = [[[0, a], [a, a], [a, b], [a + b + c, 0], [a + b, 0]]];
  return {kind: 'three-squares', sides: [a, b, c], firstSide: a, outlines, shaded};
}
// Shoelace is an independent test oracle, not a method shown to pupils.
function area(points: Polygon): number {
  return Math.abs(points.reduce((sum, [x, y], i) => {
    const [nextX, nextY] = points[(i + 1) % points.length];
    return sum + x * nextY - y * nextX;
  }, 0)) / 2;
}
function solveVisible(q: Pick<Question, 'context'>): number {
  return visibleGeometry(q).shaded.reduce((total, polygon) => total + area(polygon), 0);
}
function pathPoints(d: string): Polygon {
  expect(d).toMatch(/^M /);
  expect(d).toMatch(/ Z$/);
  expect(d.replace(/[MLZ\s\d.e+\-]/gi, '')).toBe('');
  const values = (d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  expect(values.length % 2).toBe(0);
  return Array.from({length: values.length / 2}, (_, i) => [values[i * 2], values[i * 2 + 1]]);
}
function comparePolygons(actual: Polygon[], expected: Polygon[]) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((polygon, i) => {
    expect(polygon).toHaveLength(expected[i].length);
    polygon.forEach((point, j) => point.forEach((n, axis) => expect(n).toBeCloseTo(expected[i][j][axis], 6)));
  });
}

describe('shaded square arrangements', () => {
  it('solves varied visible constructions independently and checks every drawn region', () => {
    const seen = new Set<string>(), variations = new Map<string, Set<string>>();
    let sawHalfSquareCentimetre = false;
    for (let seed = -12; seed <= 72; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const g = visibleGeometry(q);
        const expected = solveVisible({context: q.context});
        seen.add(g.kind);
        if (!variations.has(g.kind)) variations.set(g.kind, new Set());
        variations.get(g.kind)!.add(g.sides.join(','));
        expect(Number(q.answer)).toBeCloseTo(expected, 8);
        expect(expected).toBeGreaterThan(0);
        if (!Number.isInteger(expected)) sawHalfSquareCentimetre = true;
        expect(q.unit).toBe('cm²');
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => !!step.text && !!step.equation)).toBe(true);
        expect(q.explanation).toContain(q.workedSteps!.at(-1)!.equation!);
        expect(g.sides.every(n => Number.isInteger(n) && n >= 3 && n <= 24)).toBe(true);

        if (g.kind === 'midpoints') {
          expect(q.context!.join(' ')).toContain('midpoints of the outer square');
          expect(q.context!.join(' ')).toContain('midpoints of the tilted square');
          expect(g.sides[0] % 2).toBe(0);
          expect(g.sides[0]).not.toBe(10);
          expect(q.choices).toBeUndefined();
        } else if (g.kind === 'two-squares') {
          expect(g.sides[0]).toBeGreaterThan(g.sides[1]);
          expect(g.sides[0]).toBeGreaterThanOrEqual(6);
          expect(q.context!.join(' ')).toContain('both bottom corners of the right square');
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => Number(choice) === expected)).toHaveLength(1);
        } else {
          const [a, b, c] = g.sides;
          expect(a).toBeLessThan(c);
          expect(c).toBeLessThan(b);
          expect(a).toBeGreaterThanOrEqual(4);
          expect(q.context!.join(' ')).toContain('all three bottom edges on the same straight line');
          expect(q.choices).toBeUndefined();
        }

        const picture = q.picture;
        if (!picture || picture.type !== 'batch11-upper') throw Error('Unsupported diagram');
        const paths = picture.marks.filter(mark => mark.kind === 'path');
        const outlines = paths.filter(mark => !mark.fill || mark.fill === 'none').map(mark => pathPoints(mark.d));
        const shaded = paths.filter(mark => mark.fill && mark.fill !== 'none').map(mark => pathPoints(mark.d));
        const first = outlines[0], originX = Math.min(...first.map(p => p[0])), baseline = Math.max(...first.map(p => p[1]));
        const scale = (Math.max(...first.map(p => p[0])) - originX) / g.firstSide;
        expect(scale).toBeGreaterThan(0);
        const normalise = (polygon: Polygon): Polygon => polygon.map(([x, y]) => [(x - originX) / scale, (baseline - y) / scale]);
        comparePolygons(outlines.map(normalise), g.outlines);
        comparePolygons(shaded.map(normalise), g.shaded);
        expect(shaded.reduce((sum, p) => sum + area(p) / (scale * scale), 0)).toBeCloseTo(expected, 6);
        for (const polygon of [...outlines, ...shaded]) {
          for (const [x, y] of polygon) {
            expect(x).toBeGreaterThanOrEqual(30);
            expect(x).toBeLessThanOrEqual(290);
            expect(y).toBeGreaterThanOrEqual(30);
            expect(y).toBeLessThanOrEqual(164);
          }
        }
        const labels = picture.marks.filter(mark => mark.kind === 'text');
        expect(labels.map(mark => mark.text)).toEqual(g.sides.map(n => `${n} cm`));
        for (const label of labels) {
          expect(label.x).toBeGreaterThan(0);
          expect(label.x + 10 * label.text.length).toBeLessThan(320);
          expect(label.y).toBe(188);
        }
      }
    }
    expect([...seen].sort()).toEqual(['midpoints', 'three-squares', 'two-squares']);
    for (const values of variations.values()) expect(values.size).toBeGreaterThan(5);
    expect(sawHalfSquareCentimetre).toBe(true);
  });

  it('keeps the oracle independent of stored answers and honours visible numbers', () => {
    const q = makeRagQuestion(41, 2), original = solveVisible(q);
    expect(solveVisible({...q, answer: '-999'} as Question)).toBe(original);
    expect(solveVisible({context: [
      'The left square has side 9 cm. The right square has side 5 cm.',
    ]})).toBe(22.5);
    expect(solveVisible({context: [
      'The left, middle and right squares have sides 4 cm, 10 cm and 7 cm, respectively.',
    ]})).toBe(73);
    expect(solveVisible({context: ['The outer square has side 12 cm.']})).toBe(36);
  });

  it('replays deterministically and renders all variants with the existing SVG component', () => {
    expect(makeRagQuestion(29)).toEqual(makeRagQuestion(29, 0));
    const seen = new Set<string>();
    for (let index = 0; index < 60; index++) {
      const q = makeRagQuestion(29, index);
      expect(makeRagQuestion(29, index)).toEqual(q);
      const kind = visibleGeometry(q).kind;
      if (seen.has(kind)) continue;
      seen.add(kind);
      if (q.picture?.type !== 'batch11-upper') throw Error('Unsupported diagram');
      const svg = renderToStaticMarkup(createElement(Batch11UpperDiagram, {model: q.picture}));
      expect(svg).toContain('viewBox="0 0 320 200"');
      expect(svg).toContain('role="img"');
      expect(svg).toContain('aria-label=');
      expect(svg).not.toMatch(/NaN|Infinity|<image|<script/);
    }
    expect(seen.size).toBe(3);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('shaded-area-in-square-arrangements');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03']);
  });
});
