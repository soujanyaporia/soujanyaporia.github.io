import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRemainingPolygonArea';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'choices' | 'unit'>;
type Point = [number, number];
type Givens =
  | {kind: 'square'; side: number; cut: number}
  | {kind: 'triangle'; width: number; height: number; inset: number; inner: number; outer: number};

// Deliberately excludes the answer, worked solution, proof and generator state.
function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture, choices: q.choices, unit: q.unit};
}

function readGivens(v: Visible): Givens {
  const statement = (v.context ?? []).join(' ');
  const square = /A square card has sides of (\d+) cm\./.exec(statement);
  if (square) {
    const cuts = /Two matching square pieces, each with sides of (\d+) cm, are cut from opposite corners\./.exec(statement);
    if (!cuts) throw new Error('The number, size or placement of the removals is missing.');
    if (!statement.includes('The shaded part is kept.')) throw new Error('The requested region is unspecified.');
    return {kind: 'square', side: Number(square[1]), cut: Number(cuts[1])};
  }
  if (!statement.includes('ABCD is a rectangle. E lies on side DC, between D and C.')) {
    throw new Error('The rectangle and interior point must be explicit.');
  }
  const sides = /AB = (\d+) cm, BC = (\d+) cm and DE = (\d+) cm\./.exec(statement);
  const slopes = /AE = (\d+) cm and AC = (\d+) cm\. The triangle AEC is shaded\./.exec(statement);
  if (!sides || !slopes) throw new Error('Visible dimensions or shading are missing.');
  return {
    kind: 'triangle', width: Number(sides[1]), height: Number(sides[2]),
    inset: Number(sides[3]), inner: Number(slopes[1]), outer: Number(slopes[2]),
  };
}

function polygonArea(points: Point[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[(i + 1) % points.length];
    twice += x * ny - nx * y;
  }
  return Math.abs(twice) / 2;
}

function solveVisible(v: Visible): number {
  const g = readGivens(v);
  if (g.kind === 'triangle') {
    // Coordinate determinant, independent of the generator's area subtraction.
    return polygonArea([[0, 0], [g.inset, g.height], [g.width, g.height]]);
  }
  // Count remaining unit squares instead of reproducing the subtraction formula.
  let kept = 0;
  for (let row = 0; row < g.side; row++) {
    for (let column = 0; column < g.side; column++) {
      const inFirstCut = row < g.cut && column < g.cut;
      const inSecondCut = row >= g.side - g.cut && column >= g.side - g.cut;
      if (!inFirstCut && !inSecondCut) kept++;
    }
  }
  return kept;
}

function pathPoints(d: string): Point[] {
  const commands = d.replace(/[-+\d.eE,\s]/g, '');
  expect(commands).toMatch(/^ML{2,}Z$/);
  const values = (d.match(/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g) ?? []).map(Number);
  expect(values.length % 2).toBe(0);
  const points: Point[] = [];
  for (let i = 0; i < values.length; i += 2) points.push([values[i], values[i + 1]]);
  return points;
}

const seeds = [-2147483648, -1, 0, 1, 2147483647, ...Array.from({length: 64}, (_, i) => i * 97 + 23)];

describe('remaining polygon area candidate', () => {
  it('independently solves visible givens over varied seeds and indices', () => {
    const kinds = new Set<string>();
    const squareSizes = new Set<string>();
    const triangleSizes = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const v = visible(q), g = readGivens(v), expected = solveVisible(v);
        kinds.add(g.kind);
        expect(q.answer).toMatch(/^\d+$/);
        expect(Number(q.answer)).toBe(expected);
        expect(expected).toBeGreaterThan(0);
        expect(q.unit).toBe('cm²');
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        for (const step of q.workedSteps ?? []) expect(q.explanation).toContain(step.text);
        if (g.kind === 'square') {
          squareSizes.add(`${g.side}:${g.cut}`);
          expect(g.cut).toBeGreaterThan(0);
          expect(g.side).toBeGreaterThan(2 * g.cut);
          expect(expected).toBeLessThan(g.side * g.side);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(choice => Number(choice) === expected)).toHaveLength(1);
          for (const choice of q.choices ?? []) expect(Number(choice)).toBeGreaterThan(0);
        } else {
          triangleSizes.add(`${g.width}:${g.height}:${g.inset}`);
          expect(g.inset).toBeGreaterThan(0);
          expect(g.inset).toBeLessThan(g.width);
          expect(g.inner * g.inner).toBe(g.inset * g.inset + g.height * g.height);
          expect(g.outer * g.outer).toBe(g.width * g.width + g.height * g.height);
          expect(expected).toBeLessThan(g.width * g.height / 2);
          expect(q.choices).toBeUndefined();
        }
      }
    }
    expect([...kinds].sort()).toEqual(['square', 'triangle']);
    expect(squareSizes.size).toBeGreaterThan(4);
    expect(triangleSizes.size).toBeGreaterThan(4);
  });

  it('draws the requested region with geometry consistent with visible dimensions', () => {
    for (const seed of seeds.slice(0, 20)) {
      for (let index = 0; index < 2; index++) {
        const v = visible(makeRagQuestion(seed, index));
        const g = readGivens(v), picture = v.picture;
        if (!picture || picture.type !== 'batch11-upper') throw new Error('Expected a supported polygon picture.');
        const fills = picture.marks.filter(mark => mark.kind === 'path' && Boolean(mark.fill));
        const outlines = picture.marks.filter(mark => mark.kind === 'path' && !mark.fill);
        expect(fills).toHaveLength(1);
        expect(outlines).toHaveLength(1);
        const fill = fills[0], outline = outlines[0];
        if (fill.kind !== 'path' || outline.kind !== 'path') throw new Error('Missing polygon paths.');
        const region = pathPoints(fill.d), boundary = pathPoints(outline.d);
        expect(boundary).toHaveLength(4);
        const xs = boundary.map(p => p[0]), ys = boundary.map(p => p[1]);
        const left = Math.min(...xs), top = Math.min(...ys);
        const width = Math.max(...xs) - left, height = Math.max(...ys) - top;
        for (const [x, y] of [...boundary, ...region]) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(320);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(200);
        }
        const physicalWhole = g.kind === 'square' ? g.side * g.side : g.width * g.height;
        const areaFromDrawing = polygonArea(region) / polygonArea(boundary) * physicalWhole;
        expect(areaFromDrawing).toBeCloseTo(solveVisible(v), 8);
        if (g.kind === 'square') {
          expect(region).toHaveLength(8);
          expect(width / height).toBeCloseTo(1, 10);
          expect((region[0][0] - left) / width).toBeCloseTo(g.cut / g.side, 10);
          expect((top + height - region[2][1]) / height).toBeCloseTo(g.cut / g.side, 10);
        } else {
          expect(region).toHaveLength(3);
          expect(width / height).toBeCloseTo(g.width / g.height, 10);
          expect(region[0]).toEqual([left, top]);
          expect(region[1][1]).toBeCloseTo(top + height, 10);
          expect(region[2][1]).toBeCloseTo(top + height, 10);
          expect((region[1][0] - left) / width).toBeCloseTo(g.inset / g.width, 10);
        }
      }
    }
  });

  it('is repeatable and alternates its supported variants within a session', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-remaining-polygon-area');
    for (const seed of seeds.slice(0, 12)) {
      const a = makeRagQuestion(seed, 0), b = makeRagQuestion(seed, 1);
      expect(makeRagQuestion(seed, 0)).toEqual(a);
      expect(readGivens(visible(a)).kind).not.toBe(readGivens(visible(b)).kind);
      expect(a.key).not.toBe(b.key);
    }
  });
});
