import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragRatioPartitionedShadedArea';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Path = Extract<Diagram['marks'][number], {kind: 'path'}>;
type Point = [number, number];

// Reads only pupil-visible sentences. No answer, seed, worked solution or generator internals.
function solve(q: Visible) {
  const visible = [q.prompt, ...(q.context ?? [])].join(' ');
  const read = (pattern: RegExp): number[] => {
    const match = pattern.exec(visible);
    if (!match) throw new Error(`Missing visible given: ${pattern}`);
    return match.slice(1).map(Number);
  };
  if (visible.includes('PQRS')) {
    const [width] = read(/SR = (\d+) cm/), [height] = read(/PS = (\d+) cm/);
    const [multiple] = read(/TU is 1\/(\d+) of UV/);
    const [givenArea] = read(/PTU has an area of (\d+) cm²/);
    if (!visible.includes('PT = VW')) throw new Error('Missing equal bases');
    const tu = height / (1 + multiple), base = 2 * givenArea / tu;
    // Equal bases make the two triangle areas proportional to their heights.
    const shaded = [givenArea, givenArea * multiple], total = width * height;
    return {kind: 'rectangle' as const, answers: [total - shaded[0] - shaded[1]], total, shaded, width, height, tu, base, multiple};
  }
  const [ad] = read(/AD = (\d+) cm/), [cd] = read(/CD = (\d+) cm/);
  const [bf] = read(/BF = (\d+) cm/), [ed] = read(/ED = (\d+) cm/);
  const [n, d] = read(/FE is (\d+)\/(\d+) of ED/);
  const fe = ed * n / d, af = ad - ed - fe, total = ad * cd / 2;
  // For (b), subtract triangle ABE directly, independently of the generator's two-area subtraction.
  const shaded = total - (ad - ed) * bf / 2;
  return {kind: 'triangle' as const, answers: [af * bf / 2, shaded], total, shaded: [shaded], ad, cd, bf, ed, fe, af};
}

function vertices(path: Path): Point[] {
  const values = (path.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  if (values.length % 2 !== 0) throw new Error('Invalid polygon coordinates');
  return Array.from({length: values.length / 2}, (_, i) => [values[2 * i], values[2 * i + 1]] as Point);
}
function area(points: Point[]): number {
  return Math.abs(points.reduce((sum, p, i) => {
    const next = points[(i + 1) % points.length];
    return sum + p[0] * next[1] - next[0] * p[1];
  }, 0)) / 2;
}
function diagram(q: Question): Diagram {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported geometry');
  return q.picture;
}

function checkGeometry(q: Question, solved: ReturnType<typeof solve>) {
  const model = diagram(q);
  const paths = model.marks.filter((m): m is Path => m.kind === 'path' && m.d.endsWith(' Z'));
  const shadedPaths = paths.filter(p => p.fill && p.fill !== 'none');
  const outerPaths = paths.filter(p => !p.fill || p.fill === 'none');
  expect(outerPaths).toHaveLength(1);
  expect(shadedPaths).toHaveLength(solved.shaded.length);
  const outer = vertices(outerPaths[0]), outerArea = area(outer);
  expect(outerArea).toBeGreaterThan(0);
  shadedPaths.forEach((p, i) => {
    const points = vertices(p);
    expect(area(points) / outerArea).toBeCloseTo(solved.shaded[i] / solved.total, 9);
    for (const [x, y] of points) {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(200);
    }
  });
  const labels = model.marks.filter(m => m.kind === 'text').map(m => m.text);
  if (solved.kind === 'rectangle') {
    const [P, T, U] = vertices(shadedPaths[0]), [u, V, W] = vertices(shadedPaths[1]);
    expect(U).toEqual(u);
    expect(T[0]).toBeCloseTo(U[0], 9);
    expect(V[0]).toBeCloseTo(U[0], 9);
    expect(P[1]).toBe(T[1]);
    expect(V[1]).toBe(W[1]);
    expect(T[0] - P[0]).toBeCloseTo(W[0] - V[0], 9);
    expect((V[1] - U[1]) / (U[1] - T[1])).toBeCloseTo(solved.multiple, 9);
    expect(W[0]).toBeLessThan(outer[2][0]);
    expect(labels).toEqual(expect.arrayContaining(['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']));
  } else {
    const [B, C, D, E] = vertices(shadedPaths[0]), [A] = outer;
    expect(area([A, B, C])).toBeCloseTo(0, 8);
    expect(C[0]).toBe(D[0]);
    expect(E[1]).toBe(D[1]);
    expect(B[0]).toBeGreaterThan(A[0]);
    expect(B[0]).toBeLessThan(E[0]);
    expect(E[0]).toBeLessThan(D[0]);
    const perpendicular = model.marks.some(m => m.kind === 'line' && Math.abs(m.x1 - B[0]) < 1e-8 && Math.abs(m.y1 - B[1]) < 1e-8 && Math.abs(m.x2 - B[0]) < 1e-8 && m.y2 === D[1]);
    expect(perpendicular).toBe(true);
    expect(labels).toEqual(expect.arrayContaining(['A', 'B', 'C', 'D', 'E', 'F']));
  }
}

describe('ratio-partitioned shaded areas', () => {
  it('solves hand-calculated visible-given examples without generated answers', () => {
    const rectangle = solve({prompt: 'Find the unshaded area.', context: [
      'PQRS is a rectangle. SR = 40 cm; PS = 18 cm.',
      'PT = VW. TU is 1/2 of UV. Triangle PTU has an area of 42 cm².',
    ]});
    expect(rectangle.answers).toEqual([594]);
    const triangle = solve({prompt: 'Find both areas.', context: [
      'AD = 60 cm; CD = 30 cm; BF = 15 cm; ED = 18 cm.',
      'FE is 2/3 of ED.',
    ]});
    expect(triangle.answers).toEqual([225, 585]);
  });

  it('independently solves varied seeds and verifies bounds, linked responses and diagrams', () => {
    const families = new Set<string>(), visibleQuestions = new Set<string>();
    for (let seed = -20; seed < 100; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solve({prompt: q.prompt, context: q.context});
        families.add(solved.kind);
        visibleQuestions.add(JSON.stringify([q.prompt, q.context]));
        expect(q.unit).toBe('cm²');
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(6);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(50);
        for (const answer of solved.answers) {
          expect(Number.isSafeInteger(answer)).toBe(true);
          expect(answer).toBeGreaterThan(0);
          expect(answer).toBeLessThan(solved.total);
        }
        if (solved.kind === 'rectangle') {
          expect(q.structuredResponse).toBeUndefined();
          expect(Number(q.answer)).toBe(solved.answers[0]);
          expect(solved.base * 2).toBeLessThan(solved.width);
          expect(solved.tu).toBeGreaterThan(0);
          expect(solved.tu).toBeLessThan(solved.height);
        } else {
          expect(solved.af).toBeGreaterThan(0);
          expect(solved.fe).toBeGreaterThan(0);
          expect(solved.ed).toBeGreaterThan(0);
          expect(solved.bf * solved.ad).toBe(solved.cd * solved.af);
          expect(q.structuredResponse?.kind).toBe('number-pair');
          expect(JSON.parse(q.answer).map(Number)).toEqual(solved.answers);
          const correct = JSON.stringify(solved.answers.map(String));
          const wrong = JSON.stringify([String(solved.answers[0]), String(solved.answers[1] + 1)]);
          expect(structuredResponseCorrect(q.structuredResponse!, q.answer, correct)).toBe(true);
          expect(structuredResponseCorrect(q.structuredResponse!, q.answer, wrong)).toBe(false);
          expect(structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify([String(solved.answers[0])]))).toBe(false);
        }
        checkGeometry(q, solved);
      }
    }
    expect([...families].sort()).toEqual(['rectangle', 'triangle']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is reproducible and gives both variants for consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-shaded-area-ratio-partitioned-dimensions');
    for (const seed of [-123, 0, 1, 17, 908, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
      expect(solve(makeRagQuestion(seed, 0)).kind).not.toBe(solve(makeRagQuestion(seed, 1)).kind);
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
  });
});
