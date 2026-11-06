import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Question } from '../generate';
import { Picture } from '../Picture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion, RAG_PATTERN } from './ragDimensionsFromAreaAndShapeProportions';

type Point = [number, number];
type Visible = Pick<Question, 'context' | 'prompt' | 'picture' | 'unit' | 'structuredResponse'>;
type Diagram = Extract<NonNullable<Question['picture']>, { type: 'batch11-upper' }>;

function visible(q: Question): Visible {
  return { context: q.context, prompt: q.prompt, picture: q.picture, unit: q.unit, structuredResponse: q.structuredResponse };
}

function vertices(d: string): Point[] {
  expect(d.trim().endsWith('Z')).toBe(true);
  expect(d.replace(/[MLZ\d\s.\-]/g, '')).toBe('');
  const values = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  expect(values.length % 2).toBe(0);
  const result: Point[] = [];
  for (let i = 0; i < values.length; i += 2) result.push([values[i], values[i + 1]]);
  expect(result.length).toBeGreaterThanOrEqual(3);
  return result;
}

function area(points: Point[]): number {
  return Math.abs(points.reduce((sum, [x, y], i) => {
    const [u, v] = points[(i + 1) % points.length];
    return sum + x * v - u * y;
  }, 0)) / 2;
}

function box(points: Point[]) {
  const left = Math.min(...points.map(p => p[0]));
  const right = Math.max(...points.map(p => p[0]));
  const top = Math.min(...points.map(p => p[1]));
  const bottom = Math.max(...points.map(p => p[1]));
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function inside([x, y]: Point, points: Point[]): boolean {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) result = !result;
  }
  return result;
}

// Check coverage at every rectangular cell induced by visible tile edges.
// For these orthogonal polygons this detects gaps and overlaps independently.
function tiling(polygons: Point[][]) {
  const points = polygons.flat();
  const bounds = box(points);
  const xs = [...new Set(points.map(p => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) {
    for (let j = 1; j < ys.length; j++) {
      const centre: Point = [(xs[i - 1] + xs[i]) / 2, (ys[j - 1] + ys[j]) / 2];
      expect(polygons.filter(p => inside(centre, p))).toHaveLength(1);
    }
  }
  expect(polygons.reduce((sum, p) => sum + area(p), 0)).toBeCloseTo(bounds.width * bounds.height, 8);
  return bounds;
}

function distanceSignature(points: Point[]): number[] {
  const values: number[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      values.push((points[i][0] - points[j][0]) ** 2 + (points[i][1] - points[j][1]) ** 2);
    }
  }
  return values.sort((a, b) => a - b);
}

function readArea(text: string, expression: RegExp): number {
  const match = expression.exec(text);
  if (!match) throw new Error(`Missing visible area: ${expression}`);
  return Number(match[1]);
}

// This solver receives no answer, explanation, worked steps, seed or generation parameters.
// It obtains linear scale from a visible area and polygon determinants, then measures
// the requested boundary. It does not repeat the generator's breadth/side formulas.
function solve(q: Visible) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Expected the supported marked diagram');
  const picture: Diagram = q.picture;
  const text = q.context?.join(' ') ?? '';
  const polygons = picture.marks.filter(m => m.kind === 'path').map(m => vertices(m.d));
  for (const [x, y] of polygons.flat()) {
    expect(x).toBeGreaterThanOrEqual(10);
    expect(x).toBeLessThanOrEqual(305);
    expect(y).toBeGreaterThanOrEqual(20);
    expect(y).toBeLessThanOrEqual(180);
  }
  for (const mark of picture.marks) {
    if (mark.kind === 'text') {
      expect(mark.x).toBeGreaterThanOrEqual(10);
      expect(mark.x).toBeLessThanOrEqual(290);
      expect(mark.y).toBeGreaterThanOrEqual(20);
      expect(mark.y).toBeLessThanOrEqual(185);
    }
  }

  if (q.prompt.includes('ABCD')) {
    expect(q.prompt).toBe('What is the perimeter of rectangle ABCD?');
    expect(text).toContain('Three identical rectangular tiles');
    expect(text).toContain('whole numbers of centimetres');
    expect(polygons).toHaveLength(3);
    const whole = tiling(polygons);
    const dimensions = polygons.map(p => {
      expect(p).toHaveLength(4);
      const b = box(p);
      expect(area(p)).toBe(b.width * b.height);
      return [b.width, b.height].sort((a, b) => a - b);
    });
    dimensions.forEach(d => expect(d).toEqual(dimensions[0]));
    expect(dimensions[0][1]).toBe(2 * dimensions[0][0]);
    const given = readArea(text, /Rectangle ABCD has an area of (\d+) cm²\./);
    const scale = Math.sqrt(given / (whole.width * whole.height));
    dimensions.flat().forEach(d => expect(d * scale).toBeCloseTo(Math.round(d * scale), 8));
    expect(q.unit).toBe('cm');
    expect(q.structuredResponse).toBeUndefined();
    return { variant: 'three-tiles', areas: [given], answers: [2 * (whole.width + whole.height) * scale] };
  }

  if (q.prompt.startsWith('(a)')) {
    expect(q.prompt).toBe('(a) How long is rectangle B? (b) What is the perimeter of the whole path?');
    expect(text).toContain('Two identical L-shaped tiles');
    expect(text).toContain('same two tiles');
    expect(text).toContain('joined at their short sides in one straight row');
    expect(text).toContain('no gaps or overlaps');
    expect(text).toContain('same width as B');
    expect(polygons).toHaveLength(4);
    const labels = picture.marks.filter(m => m.kind === 'text');
    const aLabel = labels.find(m => m.text === 'A');
    const bLabel = labels.find(m => m.text === 'B');
    if (!aLabel || !bLabel) throw new Error('Missing A/B labels');
    const separator = (aLabel.x + bLabel.x) / 2;
    const aTiles = polygons.filter(p => (box(p).left + box(p).right) / 2 < separator);
    const bTiles = polygons.filter(p => (box(p).left + box(p).right) / 2 > separator);
    expect(aTiles).toHaveLength(2);
    expect(bTiles).toHaveLength(2);
    polygons.forEach(p => {
      expect(p).toHaveLength(6);
      expect(distanceSignature(p)).toEqual(distanceSignature(polygons[0]));
    });
    const a = tiling(aTiles);
    const b = tiling(bTiles);
    expect(a.width).toBe(a.height);
    expect(a.width * a.height).toBe(b.width * b.height);
    const given = readArea(text, /Square A has an area of (\d+) m²\./);
    const pathArea = readArea(text, /The path has an area of (\d+) m²\./);
    expect(Number.isInteger(pathArea / given)).toBe(true);
    const scale = Math.sqrt(given / (a.width * a.height));
    const length = Math.max(b.width, b.height) * scale;
    const width = Math.min(b.width, b.height) * scale;
    const pathLength = pathArea / width;
    expect(q.unit).toBeUndefined();
    expect(q.structuredResponse).toEqual({
      kind: 'number-fields', fields: [
        { label: '(a) Length of B (m)', decimal: true },
        { label: '(b) Perimeter of the path (m)', decimal: true },
      ],
    });
    return { variant: 'rearranged-path', areas: [given, pathArea], answers: [length, 2 * (pathLength + width)] };
  }

  expect(q.prompt).toBe('What is the length of the lower rectangle?');
  expect(text).toContain('two identical smaller squares above one rectangle');
  expect(text).toContain('T lies on the top edge');
  expect(text).toContain('both bottom corners');
  expect(polygons).toHaveLength(4);
  const pieces = polygons.filter(p => p.length === 4);
  const triangles = polygons.filter(p => p.length === 3);
  expect(pieces).toHaveLength(3);
  expect(triangles).toHaveLength(1);
  const whole = tiling(pieces);
  expect(whole.width).toBe(whole.height);
  const squares = pieces.filter(p => box(p).width === box(p).height);
  const rectangles = pieces.filter(p => box(p).width !== box(p).height);
  expect(squares).toHaveLength(2);
  expect(rectangles).toHaveLength(1);
  expect(area(squares[0])).toBe(area(squares[1]));
  const rectangle = box(rectangles[0]);
  const triangle = triangles[0];
  const apex = triangle.filter(p => p[1] === rectangle.top);
  expect(apex).toHaveLength(1);
  expect(apex[0][0]).toBeGreaterThan(rectangle.left);
  expect(apex[0][0]).toBeLessThan(rectangle.right);
  expect(triangle).toContainEqual([rectangle.left, rectangle.bottom]);
  expect(triangle).toContainEqual([rectangle.right, rectangle.bottom]);
  expect(area(triangle)).toBe(area(rectangles[0]) / 2);
  const given = readArea(text, /The shaded triangle has an area of (\d+) cm²\./);
  const scale = Math.sqrt(given / area(triangle));
  expect(q.unit).toBe('cm');
  expect(q.structuredResponse).toBeUndefined();
  return { variant: 'square-partition', areas: [given], answers: [rectangle.width * scale] };
}

it('independently solves every variant from visible areas and diagrams across varied seeds', () => {
  const seen = new Map<string, Set<string>>();
  const apexPositions = new Set<number>();
  let fractionalLengths = 0;
  for (let seed = -20; seed <= 80; seed++) {
    for (const index of [0, 1, 2, 7]) {
      const q = makeRagQuestion(seed, index);
      const result = solve(visible(q));
      const answers: string[] = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
      expect(answers).toHaveLength(result.answers.length);
      answers.forEach((answer, i) => {
        expect(Number(answer)).toBeCloseTo(result.answers[i], 8);
        expect(Number(answer)).toBeGreaterThan(0);
        expect(Number.isFinite(Number(answer))).toBe(true);
      });
      if (q.structuredResponse) {
        const independentlySolved = JSON.stringify(result.answers.map(n => String(Number(n.toFixed(8)))));
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, independentlySolved)).toBe(true);
        const wrong = JSON.stringify([answers[0], String(Number(answers[1]) + 1)]);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, wrong)).toBe(false);
      }
      if (result.variant === 'three-tiles') expect(result.areas[0]).not.toBe(54);
      if (result.variant === 'rearranged-path') {
        expect(result.areas[0]).not.toBe(81);
        expect(result.areas[1]).not.toBe(2106);
        if (!Number.isInteger(Number(answers[0]))) fractionalLengths++;
      }
      if (result.variant === 'square-partition') {
        expect(result.areas[0]).not.toBe(36);
        if (q.picture?.type === 'batch11-upper') {
          const t = q.picture.marks.find(m => m.kind === 'text' && m.text === 'T');
          if (t?.kind === 'text') apexPositions.add(t.x);
        }
      }
      expect(q.choices).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
      expect(q.hint.length).toBeGreaterThan(0);
      q.workedSteps!.forEach(step => {
        expect(step.text.length).toBeGreaterThan(0);
        expect(q.explanation).toContain(step.text);
        if (step.equation) expect(q.explanation).toContain(step.equation);
      });
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const values = seen.get(result.variant) ?? new Set<string>();
      values.add(result.areas.join(':'));
      seen.set(result.variant, values);
    }
  }
  expect([...seen.keys()].sort()).toEqual(['rearranged-path', 'square-partition', 'three-tiles']);
  seen.forEach(values => expect(values.size).toBeGreaterThanOrEqual(6));
  expect(fractionalLengths).toBeGreaterThan(0);
  expect(apexPositions.size).toBe(4);
});

it('doubles every requested length when all visible areas are quadrupled', () => {
  for (const index of [0, 1, 2]) {
    const original = visible(makeRagQuestion(37, index));
    const changed: Visible = {
      ...original,
      context: original.context?.map(text => text.replace(/(\d+) (cm²|m²)/g,
        (_, amount: string, unit: string) => `${4 * Number(amount)} ${unit}`)),
    };
    const before = solve(original);
    const after = solve(changed);
    after.answers.forEach((answer, i) => expect(answer).toBeCloseTo(2 * before.answers[i], 8));
  }
});

it('renders all variants with the existing picture component and no external images', () => {
  for (const index of [0, 1, 2]) {
    const q = makeRagQuestion(22, index);
    if (!q.picture) throw new Error('Missing necessary diagram');
    const html = renderToStaticMarkup(createElement(Picture, { model: q.picture }));
    expect(html).toContain('<svg');
    expect(html).toContain('viewBox="0 0 320 200"');
    expect(html).toContain('role="img"');
    expect(html).toContain('<path');
    expect(html).not.toContain('<image');
    expect(html).not.toContain('NaN');
  }
});

it('exports the required family metadata and uses the default index consistently', () => {
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-dimensions-from-area-and-shape-proportions');
  const permitted = ['P4.S.AREA.01', 'P3.S.AREA.02', 'P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'];
  RAG_PATTERN.skillIds.forEach(id => expect(permitted).toContain(id));
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
});
