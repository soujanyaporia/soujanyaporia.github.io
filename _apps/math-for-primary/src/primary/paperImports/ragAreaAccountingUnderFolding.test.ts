import {describe, expect, it} from 'vitest';
import {correctAnswer, type Picture, type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {makeRagQuestion, RAG_PATTERN} from './ragAreaAccountingUnderFolding';

type Point = [number, number];

function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    twiceArea += points[i][0] * next[1] - points[i][1] * next[0];
  }
  return Math.abs(twiceArea) / 2;
}

// Intercept-form reflection of a right-angle corner across its fold line.
// This solver uses only lengths stated to the pupil.
function cornerImage(horizontal: number, vertical: number): Point {
  const denominator = horizontal * horizontal + vertical * vertical;
  return [
    2 * horizontal * vertical * vertical / denominator,
    2 * horizontal * horizontal * vertical / denominator,
  ];
}

function numbers(text: string, expression: RegExp): number[] {
  const match = expression.exec(text);
  if (!match) throw new Error('A required visible given is missing');
  return match.slice(1).map(Number);
}

function solveVisible(question: Pick<Question, 'prompt' | 'context'>) {
  const text = question.context?.join(' ') ?? '';
  if (question.prompt.includes('before the fold')) {
    const [width, depth] = numbers(text, /AD = (\d+) cm and DE = (\d+) cm/);
    const [exposed] = numbers(text, /ABCEF has area (\d+) cm²/);
    const corner = polygonArea([[0, 0], [width, 0], [width, depth]]);
    return {variant: 'recover', width, answer: exposed + corner + corner};
  }
  expect(question.prompt).toBe('What is the area of the paper left after both cuts?');
  expect(text).toContain('PD = QB.');
  expect(text).toContain('through both layers');
  const [width, topDepth, equalSide] = numbers(text, /AB = (\d+) cm, AP = (\d+) cm and QB = (\d+) cm/);
  const [foldedBase, bottomDepth] = numbers(text, /RG = (\d+) cm and SC = (\d+) cm/);
  const height = topDepth + equalSide;
  const topBase = width - equalSide;
  const topImage = cornerImage(topBase, topDepth);
  const bottomImage = cornerImage(foldedBase, bottomDepth);
  const firstCut = polygonArea([[0, 0], [0, topDepth], topImage, [topBase, 0]]);
  const secondCut = polygonArea([[0, 0], [0, bottomDepth], bottomImage, [foldedBase, 0]]);
  return {variant: 'cut', width, answer: width * height - firstCut - secondCut};
}

function filledPolygons(picture: Picture | undefined) {
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Expected the supported marked diagram');
  const result: {fill: string; points: Point[]}[] = [];
  for (const mark of picture.marks) {
    if (mark.kind !== 'path' || !mark.fill) continue;
    expect(mark.d).toMatch(/^M .* Z$/);
    const coordinates = (mark.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    expect(coordinates.length % 2).toBe(0);
    const points: Point[] = [];
    for (let i = 0; i < coordinates.length; i += 2) {
      expect(Number.isFinite(coordinates[i])).toBe(true);
      expect(Number.isFinite(coordinates[i + 1])).toBe(true);
      points.push([coordinates[i], coordinates[i + 1]]);
    }
    result.push({fill: mark.fill, points});
  }
  return result;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function checkVisibleGeometry(question: Question, solution: ReturnType<typeof solveVisible>) {
  const polygons = filledPolygons(question.picture);
  if (solution.variant === 'recover') {
    expect(polygons).toHaveLength(2);
    const [A, B, C, E, F] = polygons[0].points;
    const D: Point = [C[0], A[1]];
    const scale = distance(B, C) / solution.width;
    const originalCorner = polygonArea([A, D, E]);
    expect(polygons[0].fill).toBe('#b7d6c7');
    expect(polygons[1].fill).toBe('#ffffff');
    expect(polygonArea(polygons[1].points)).toBeCloseTo(originalCorner, 8);
    expect(distance(A, F)).toBeCloseTo(distance(A, D), 8);
    expect(distance(E, F)).toBeCloseTo(distance(E, D), 8);
    expect(F[0]).toBeGreaterThan(B[0]);
    expect(F[0]).toBeLessThan(C[0]);
    expect(F[1]).toBeGreaterThan(B[1]);
    expect(F[1]).toBeLessThan(A[1]);
    const reconstructed = polygonArea(polygons[0].points) + 2 * originalCorner;
    expect(reconstructed / (scale * scale)).toBeCloseTo(solution.answer, 8);
    return;
  }

  expect(polygons).toHaveLength(3);
  const [D, P, Q, B, S, R] = polygons[0].points;
  const F = polygons[1].points[1];
  const G = polygons[2].points[1];
  const A: Point = [D[0], B[1]];
  const C: Point = [B[0], D[1]];
  const scale = distance(A, B) / solution.width;
  expect(distance(D, P)).toBeCloseTo(distance(Q, B), 8);
  expect(distance(P, F)).toBeCloseTo(distance(P, A), 8);
  expect(distance(Q, F)).toBeCloseTo(distance(Q, A), 8);
  expect(distance(R, G)).toBeCloseTo(distance(R, C), 8);
  expect(distance(S, G)).toBeCloseTo(distance(S, C), 8);
  for (const [x, y] of [F, G]) {
    expect(x).toBeGreaterThan(A[0]);
    expect(x).toBeLessThan(B[0]);
    expect(y).toBeGreaterThan(A[1]);
    expect(y).toBeLessThan(D[1]);
  }
  expect(Math.max(...polygons[1].points.map(point => point[0])))
    .toBeLessThan(Math.min(...polygons[2].points.map(point => point[0])));
  const remaining = polygonArea(polygons[0].points)
    - polygonArea(polygons[1].points) - polygonArea(polygons[2].points);
  expect(remaining / (scale * scale)).toBeCloseTo(solution.answer, 8);
  const finalPicture = question.workedSteps?.at(-1)?.picture;
  const finalPolygons = filledPolygons(finalPicture);
  expect(finalPolygons).toHaveLength(1);
  expect(polygonArea(finalPolygons[0].points) / (scale * scale)).toBeCloseTo(solution.answer, 8);
}

describe('area accounting under folding', () => {
  it('independently solves visible givens and checks drawn folds across varied seeds', () => {
    const variants = new Set<string>();
    const visibleByVariant = new Map<string, Set<string>>();
    for (let seed = -24; seed <= 96; seed++) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible({prompt: question.prompt, context: question.context});
        variants.add(solution.variant);
        const visible = visibleByVariant.get(solution.variant) ?? new Set<string>();
        visible.add(JSON.stringify(question.context));
        visibleByVariant.set(solution.variant, visible);
        expect(Number(question.answer)).toBeCloseTo(solution.answer, 8);
        expect(Number.isInteger(Number(question.answer))).toBe(true);
        expect(solution.answer).toBeGreaterThan(0);
        expect(question.unit).toBe('cm²');
        expect(question.choices).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(60);
        expect(correctAnswer(question, String(Math.round(solution.answer)))).toBe(true);
        expect(correctAnswer(question, String(Math.round(solution.answer) + 1))).toBe(false);
        checkVisibleGeometry(question, solution);
      }
    }
    expect([...variants].sort()).toEqual(['cut', 'recover']);
    for (const visible of visibleByVariant.values()) expect(visible.size).toBeGreaterThan(20);
  });

  it('replays deterministically and selects both variants within a session', () => {
    for (const seed of [-2147483648, -1, 0, 1, 47, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const variants = new Set<string>();
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        variants.add(solveVisible(question).variant);
      }
      expect(variants.size).toBe(2);
    }
  });

  it('uses the declared Primary 5 family and existing curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-area-accounting-under-folding');
    for (const id of RAG_PATTERN.skillIds) {
      const skill = CURRICULUM_SKILLS.find(item => item.id === id);
      expect(skill).toBeDefined();
      expect(skill!.level).toBeLessThanOrEqual(5);
    }
  });
});
