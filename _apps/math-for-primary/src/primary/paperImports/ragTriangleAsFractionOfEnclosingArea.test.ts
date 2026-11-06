import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Question } from '../generate';
import { Picture } from '../Picture';
import { makeRagQuestion, RAG_PATTERN } from './ragTriangleAsFractionOfEnclosingArea';

type Point = [number, number];
type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;

function visibleOnly(q: Question): Visible {
  return { prompt: q.prompt, context: q.context, picture: q.picture };
}

function vertices(d: string): Point[] {
  expect(d.trim().endsWith('Z')).toBe(true);
  const numbers = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  expect(numbers.length % 2).toBe(0);
  const points: Point[] = [];
  for (let i = 0; i < numbers.length; i += 2) {
    points.push([numbers[i], numbers[i + 1]]);
  }
  return points;
}

function polygonArea(points: Point[]): number {
  let twiceArea = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[(i + 1) % points.length];
    twiceArea += x * nextY - nextX * y;
  }
  return Math.abs(twiceArea) / 2;
}

function sameVertices(actual: Point[], expected: Point[]) {
  const sorted = (points: Point[]) => points.map(point => point.join(',')).sort();
  expect(sorted(actual)).toEqual(sorted(expected));
}

// Only the displayed area, request and drawn geometry enter this solver.
// Polygon determinants independently recover the requested fraction.
function solveVisible(q: Visible) {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing diagram');
  const text = q.context?.join(' ') ?? '';
  const match = /(?:Square|Rectangle) PQRS has an area of (\d+) cm²\./.exec(text);
  if (!match) throw new Error('Missing enclosing area');
  const totalArea = Number(match[1]);
  const paths = picture.marks.filter(mark => mark.kind === 'path');
  expect(paths).toHaveLength(2);
  const outline = paths.find(path => path.fill === 'none');
  const shaded = paths.find(path => path.fill && path.fill !== 'none');
  if (!outline || !shaded) throw new Error('Missing region boundaries');
  const boundary = vertices(outline.d);
  const triangle = vertices(shaded.d);
  expect(boundary).toHaveLength(4);
  expect(triangle).toHaveLength(3);
  const [P, Q, R, S] = boundary;
  expect(P[1]).toBe(Q[1]);
  expect(Q[0]).toBe(R[0]);
  expect(R[1]).toBe(S[1]);
  expect(S[0]).toBe(P[0]);
  expect(Q[0]).toBeGreaterThan(P[0]);
  expect(S[1]).toBeGreaterThan(P[1]);

  const labels = picture.marks.filter(mark => mark.kind === 'text');
  const checkLabel = (name: string, point: Point) => {
    const matches = labels.filter(label => label.text === name);
    expect(matches).toHaveLength(1);
    expect(Math.hypot(matches[0].x - point[0], matches[0].y - point[1])).toBeLessThan(30);
  };
  checkLabel('P', P);
  checkLabel('Q', Q);
  checkLabel('R', R);
  checkLabel('S', S);
  for (const point of [...boundary, ...triangle]) {
    expect(point[0]).toBeGreaterThanOrEqual(0);
    expect(point[0]).toBeLessThanOrEqual(320);
    expect(point[1]).toBeGreaterThanOrEqual(0);
    expect(point[1]).toBeLessThanOrEqual(200);
  }
  for (const label of labels) {
    expect(label.x).toBeGreaterThanOrEqual(0);
    expect(label.x).toBeLessThan(300);
    expect(label.y).toBeGreaterThanOrEqual(17);
    expect(label.y).toBeLessThanOrEqual(193);
  }

  let requestedPixelArea: number;
  let variant: string;
  if (text.includes('split into 4 equal smaller squares')) {
    variant = 'subdivided-square';
    expect(q.prompt).toBe('How much area does the shaded triangle QEF cover?');
    expect(text).toContain('in 2 rows and 2 columns');
    expect(text).toContain('E is halfway along PS and F is halfway along SR');
    expect(text).toContain('EF is a diagonal of the lower-left small square');
    expect(text).toContain('Only triangle QEF is shaded');
    expect(Q[0] - P[0]).toBe(S[1] - P[1]);
    const E: Point = [P[0], (P[1] + S[1]) / 2];
    const F: Point = [(S[0] + R[0]) / 2, S[1]];
    sameVertices(triangle, [Q, E, F]);
    checkLabel('E', E);
    checkLabel('F', F);
    expect(labels).toHaveLength(6);
    const dividers = picture.marks.filter(mark => mark.kind === 'line').filter(line => line.dashed);
    expect(dividers).toHaveLength(2);
    const segments = dividers.map(line => [[line.x1, line.y1], [line.x2, line.y2]]);
    expect(segments).toContainEqual([[P[0], E[1]], [Q[0], E[1]]]);
    expect(segments).toContainEqual([[F[0], P[1]], F]);
    requestedPixelArea = polygonArea(triangle);
  } else {
    expect(text).toContain('PQRS is a rectangle');
    expect(text).toContain('T lies on PQ between P and Q');
    expect(text).toContain('Only triangle STR is shaded');
    const topVertices = triangle.filter(point => point[1] === P[1]);
    expect(topVertices).toHaveLength(1);
    const T = topVertices[0];
    expect(T[0]).toBeGreaterThan(P[0]);
    expect(T[0]).toBeLessThan(Q[0]);
    checkLabel('T', T);
    expect(labels).toHaveLength(5);
    sameVertices(triangle, [S, T, R]);
    if (q.prompt === 'How much area does the shaded triangle STR cover?') {
      variant = 'rectangle-triangle';
      requestedPixelArea = polygonArea(triangle);
    } else {
      expect(q.prompt).toBe('What is the combined area of the two unshaded triangles PST and TQR?');
      variant = 'unshaded-pair';
      requestedPixelArea = polygonArea([P, S, T]) + polygonArea([T, Q, R]);
    }
  }
  return {
    answer: totalArea * requestedPixelArea / polygonArea(boundary),
    totalArea,
    variant,
  };
}

it('independently solves every variant across varied seeds and indices', () => {
  const variants = new Set<string>();
  const areas = new Set<number>();
  for (let seed = -9; seed <= 70; seed++) {
    for (const index of [0, 1, 2, 7]) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(visibleOnly(q));
      expect(Number(q.answer)).toBeCloseTo(solved.answer, 8);
      expect(Number.isInteger(Number(q.answer))).toBe(true);
      expect(solved.answer).toBeGreaterThan(0);
      expect(solved.answer).toBeLessThan(solved.totalArea);
      expect(solved.totalArea).toBeLessThanOrEqual(800);
      expect([40, 64, 832]).not.toContain(solved.totalArea);
      expect(solved.totalArea % (solved.variant === 'subdivided-square' ? 8 : 2)).toBe(0);
      expect(q.unit).toBe('cm²');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
      expect(q.workedSteps!.every(step => step.text.length > 0)).toBe(true);
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation).toContain(`${q.answer} cm²`);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      variants.add(solved.variant);
      areas.add(solved.totalArea);
    }
  }
  expect([...variants].sort()).toEqual(['rectangle-triangle', 'subdivided-square', 'unshaded-pair']);
  expect(areas.size).toBeGreaterThan(30);
});

it('scales the independently solved result when only the visible given area changes', () => {
  const doubleArea = (text: string) => text.replace(
    /has an area of (\d+) cm²/g,
    (_, n: string) => `has an area of ${2 * Number(n)} cm²`,
  );
  for (const index of [0, 1, 2]) {
    const visible = visibleOnly(makeRagQuestion(31, index));
    const original = solveVisible(visible);
    const picture = visible.picture;
    if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing diagram');
    const changed: Visible = {
      ...visible,
      context: visible.context?.map(doubleArea),
      picture: { ...picture, label: doubleArea(picture.label) },
    };
    expect(solveVisible(changed).answer).toBeCloseTo(2 * original.answer, 8);
  }
});

it('renders every variant through the existing Picture entry point', () => {
  for (const index of [0, 1, 2]) {
    const q = makeRagQuestion(55, index);
    if (!q.picture) throw new Error('Missing diagram');
    const html = renderToStaticMarkup(createElement(Picture, { model: q.picture }));
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 320 200"');
    expect(html).toContain('role="img"');
    expect(html).toContain('<path');
    expect(html).not.toContain('<image');
  }
});

it('exports the requested level, family and supported curriculum skills', () => {
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-triangle-as-fraction-of-enclosing-area');
  expect(RAG_PATTERN.skillIds).toEqual(['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03']);
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
});
