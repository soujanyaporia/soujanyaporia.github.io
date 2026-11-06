import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragTriangleDimensionsFromEnclosingShapes';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const same = (a: Point, b: Point) => distance(a, b) < 1e-7;
const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 7);
const visibleOnly = (q: Question): Visible => ({ prompt: q.prompt, context: q.context, picture: q.picture });

// Only the pupil-visible diagram, prompt and context enter this solver.
// It finds polygon area geometrically and obtains the physical scale from
// stated lengths. It never reads an answer, worked step, seed or RNG parameter.
function solveVisible(q: Visible) {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported geometry diagram');
  const dots = picture.marks.filter(m => m.kind === 'circle');
  const letters = picture.marks.filter(m => m.kind === 'text' && /^[A-Z]$/.test(m.text));
  const lines = picture.marks.filter(m => m.kind === 'line');
  const points: Record<string, Point> = {};
  for (const letter of letters) {
    if (letter.kind !== 'text') throw new Error('Expected text');
    const centre: Point = [letter.x + 5, letter.y - 6];
    const ranked = dots.map(dot => ({ point: [dot.cx, dot.cy] as Point, gap: distance(centre, [dot.cx, dot.cy]) }))
      .sort((a, b) => a.gap - b.gap);
    if (!ranked.length || ranked[0].gap > 23 || points[letter.text]) throw new Error('Unreadable point label');
    points[letter.text] = ranked[0].point;
  }
  expect(Object.keys(points)).toHaveLength(dots.length);
  expect(new Set(Object.values(points).map(p => p.join(','))).size).toBe(dots.length);
  const named = /triangle ([A-Z]{3})\?/.exec(q.prompt)?.[1];
  if (!named || [...named].some(name => !points[name])) throw new Error('Missing triangle vertices');
  const shaded = picture.marks.filter(m => m.kind === 'path' && m.fill === '#dcebd2');
  expect(shaded).toHaveLength(1);
  const path = shaded[0];
  if (path.kind !== 'path') throw new Error('Missing shaded polygon');
  const coordinates = path.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
  expect(coordinates).toHaveLength(6);
  expect(path.d.trim().endsWith('Z')).toBe(true);
  const polygon: Point[] = [[coordinates[0], coordinates[1]], [coordinates[2], coordinates[3]], [coordinates[4], coordinates[5]]];
  for (const name of named) expect(polygon.some(p => same(p, points[name]))).toBe(true);
  const text = q.context?.join(' ') ?? '';
  const dimensionTexts = picture.marks.filter(m => m.kind === 'text').map(m => m.text);
  let cmPerPixel: number;
  let variant: string;

  const rectangle = /KL = (\d+) cm, LM = (\d+) cm and PM = (\d+) cm/.exec(text);
  const tiles = /small rectangle has breadth (\d+) cm/.exec(text);
  const squares = /small square has side (\d+) cm/.exec(text);
  if (rectangle) {
    variant = 'rectangle';
    expect(named).toBe('NLP');
    expect(text).toContain('P lies on NM between N and M');
    const [width, height, cut] = rectangle.slice(1).map(Number);
    expect(cut).toBeGreaterThan(0);
    expect(cut).toBeLessThan(width);
    for (const n of [width, height, cut]) expect(dimensionTexts).toContain(`${n} cm`);
    const { K, L, M, N, P } = points;
    cmPerPixel = width / distance(K, L);
    near(distance(L, M) * cmPerPixel, height);
    near(distance(P, M) * cmPerPixel, cut);
    near(K[1], L[1]); near(N[1], M[1]); near(P[1], M[1]);
    near(K[0], N[0]); near(L[0], M[0]);
    expect(P[0]).toBeGreaterThan(N[0]);
    expect(P[0]).toBeLessThan(M[0]);
  } else if (tiles) {
    variant = 'rectangles';
    expect(named).toBe('RST');
    expect(text).toContain('Four identical rectangles');
    expect(text).toContain('Three stand side by side');
    const breadth = Number(tiles[1]);
    expect(dimensionTexts).toContain(`${breadth} cm`);
    const { R, S, T } = points;
    near(R[1], T[1]);
    const seam = lines.filter(line => close(line.y1, line.y2)
      && close(Math.min(line.x1, line.x2), R[0]) && close(Math.max(line.x1, line.x2), T[0])
      && line.y1 > S[1] + 1e-7 && line.y1 < R[1] - 1e-7);
    expect(seam).toHaveLength(1);
    const seamY = seam[0].y1;
    const stripHeight = seamY - S[1];
    expect(stripHeight).toBeGreaterThan(0);
    cmPerPixel = breadth / stripHeight;
    const dividers = lines.filter(line => close(line.x1, line.x2)
      && line.x1 > R[0] + 1e-7 && line.x1 < T[0] - 1e-7
      && close(Math.min(line.y1, line.y2), seamY) && close(Math.max(line.y1, line.y2), R[1]));
    expect(dividers).toHaveLength(2);
    const edges = [R[0], ...dividers.map(line => line.x1), T[0]].sort((a, b) => a - b);
    for (let i = 1; i < edges.length; i++) near(edges[i] - edges[i - 1], stripHeight);
    // The rotated top tile and each lower tile must have equal long sides.
    near(R[1] - seamY, T[0] - R[0]);
    expect(S[0]).toBeGreaterThan(R[0]);
    expect(S[0]).toBeLessThan(T[0]);
  } else if (squares) {
    variant = 'squares';
    expect(named).toBe('NMP');
    expect(text).toContain('Two identical small squares');
    const side = Number(squares[1]);
    expect(dimensionTexts).toContain(`${side} cm`);
    const { K, L, M, N, P, R } = points;
    cmPerPixel = side / distance(L, P);
    near(K[1], L[1]); near(L[1], P[1]);
    near(N[1], M[1]); near(M[1], R[1]);
    near(K[0], N[0]); near(L[0], M[0]); near(P[0], R[0]);
    near(distance(K, L), distance(L, M));
    near(distance(N, M), distance(L, M));
    near(distance(P, R), 2 * distance(L, P));
    const middleY = (P[1] + R[1]) / 2;
    expect(lines.some(line => close(line.y1, middleY) && close(line.y2, middleY)
      && close(Math.min(line.x1, line.x2), L[0]) && close(Math.max(line.x1, line.x2), P[0]))).toBe(true);
    expect(R[0]).toBeGreaterThan(M[0]);
  } else {
    throw new Error('Missing visible dimensional givens');
  }

  const twicePixelArea = polygon.reduce((sum, a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0);
  const area = Math.abs(twicePixelArea) * cmPerPixel * cmPerPixel / 2;
  expect(Number.isFinite(area)).toBe(true);
  expect(area).toBeGreaterThan(0);
  return { area, variant, picture };
}

it('independently solves all three arrangements from visible givens across seeds and indices', () => {
  const variants = new Set<string>();
  const areas = new Set<number>();
  for (let seed = -5; seed < 80; seed++) {
    for (const index of [0, 1, 2, 5]) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(visibleOnly(q));
      expect(Number(q.answer)).toBeCloseTo(solved.area, 7);
      expect(Number.isInteger(Number(q.answer))).toBe(true);
      expect(Number(q.answer)).toBeLessThanOrEqual(400);
      expect(q.unit).toBe('cm²');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
      expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation).toContain(`${q.answer} cm²`);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      variants.add(solved.variant);
      areas.add(Number(q.answer));
    }
  }
  expect([...variants].sort()).toEqual(['rectangle', 'rectangles', 'squares']);
  expect(areas.size).toBeGreaterThan(12);
});

it('uses visible measurements: doubling all length labels quadruples the independently solved area', () => {
  const doubleLengths = (s: string) => s.replace(/\b(\d+) cm\b/g, (_, n: string) => `${2 * Number(n)} cm`);
  const variants = new Set<string>();
  for (let seed = 0; seed < 30; seed++) {
    const q = visibleOnly(makeRagQuestion(seed, 3));
    const original = solveVisible(q);
    const picture = q.picture;
    if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing diagram');
    const changed: Visible = {
      prompt: q.prompt,
      context: q.context?.map(doubleLengths),
      picture: {
        ...picture,
        label: doubleLengths(picture.label),
        marks: picture.marks.map(mark => mark.kind === 'text' ? { ...mark, text: doubleLengths(mark.text) } : { ...mark }),
      },
    };
    expect(solveVisible(changed).area).toBeCloseTo(4 * original.area, 7);
    variants.add(original.variant);
  }
  expect(variants.size).toBe(3);
});

it('keeps essential marks and labels inside the existing renderer viewBox', () => {
  for (let seed = 0; seed < 60; seed++) {
    const { picture } = solveVisible(visibleOnly(makeRagQuestion(seed, 1)));
    const check = (x: number, y: number) => {
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(200);
    };
    for (const mark of picture.marks) {
      if (mark.kind === 'line') {
        check(mark.x1, mark.y1); check(mark.x2, mark.y2);
      } else if (mark.kind === 'circle') {
        check(mark.cx - mark.r, mark.cy - mark.r);
        check(mark.cx + mark.r, mark.cy + mark.r);
      } else if (mark.kind === 'text') {
        check(mark.x, mark.y - 17);
        check(mark.x + mark.text.length * 10, mark.y + 4);
      } else {
        const numbers = mark.d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        for (let i = 0; i < numbers.length; i += 2) check(numbers[i], numbers[i + 1]);
      }
    }
  }
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('triangle-dimensions-from-enclosing-shapes');
  expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03']);
});
