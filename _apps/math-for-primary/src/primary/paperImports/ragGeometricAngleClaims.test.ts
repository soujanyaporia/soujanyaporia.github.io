import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragGeometricAngleClaims';

type Visible = Pick<Question, 'prompt' | 'context' | 'choices' | 'picture'>;
type Vector = [number, number, number, number];
type Point = [number, number];
const zero = (): Vector => [0, 0, 0, 0];
const add = (a: Vector, b: Vector): Vector => a.map((v, i) => v + b[i]) as Vector;
const subtract = (a: Vector, b: Vector): Vector => a.map((v, i) => v - b[i]) as Vector;

// Read only the pupil's givens. Coordinates, answers, keys, worked steps and
// generator parameters are not used to solve the angle statements.
function modelFromVisible(q: Visible) {
  const prose = (q.context ?? []).join(' ');
  const triangles = /Triangles ([A-Z])O([A-Z]) and ([A-Z])O([A-Z]) meet at O\./.exec(prose);
  if (!triangles) throw new Error('Missing triangle names');
  const [, a, b, c, d] = triangles;
  if (!prose.includes(`${a}, O and ${d} are on one straight line in that order.`) ||
      !prose.includes(`${b}, O and ${c} are on another straight line in that order.`)) {
    throw new Error('Missing opposite-ray constraints');
  }
  const marked = [...prose.matchAll(/∠([A-Z]{3})/g)].map(match => match[1]);
  if (marked.length !== 5 || new Set(marked).size !== 5 || !prose.includes('all have different sizes')) {
    throw new Error('Missing distinct marked-angle constraint');
  }
  // Use independent variables p, r and x: the angle at a, the angle at c,
  // and the interior crossing angle. Each triangle has total 180 degrees.
  const angles: Record<string, Vector> = {};
  const put = (name: string, value: Vector) => {
    angles[name] = value;
    angles[name.split('').reverse().join('')] = value;
  };
  put(`O${a}${b}`, [0, 1, 0, 0]);
  put(`O${b}${a}`, [180, -1, 0, -1]);
  put(`O${c}${d}`, [0, 0, 1, 0]);
  put(`O${d}${c}`, [180, 0, -1, -1]);
  put(`${a}O${c}`, [180, 0, 0, -1]);
  put(`${a}O${b}`, [0, 0, 0, 1]);
  put(`${c}O${d}`, [0, 0, 0, 1]);
  for (const name of marked) if (!angles[name]) throw new Error('Unmapped marked angle');
  return {a, b, c, d, marked, angles};
}

function expression(value: string, angles: Record<string, Vector>): Vector {
  return value.split(' + ').reduce<Vector>((sum, term) => {
    const angle = /^∠([A-Z]{3})$/.exec(term.trim());
    if (angle) {
      if (!angles[angle[1]]) throw new Error(`Unknown angle ${term}`);
      return add(sum, angles[angle[1]]);
    }
    const number = /^(\d+)°$/.exec(term.trim());
    if (!number) throw new Error(`Unsupported visible expression ${term}`);
    return add(sum, [Number(number[1]), 0, 0, 0]);
  }, zero());
}

function equationDifference(choice: string, angles: Record<string, Vector>): Vector {
  const sides = choice.split(' = ');
  if (sides.length !== 2) throw new Error('Expected an equality');
  return subtract(expression(sides[0], angles), expression(sides[1], angles));
}
const valueAt = (v: Vector, p: number, r: number, x: number) => v[0] + v[1] * p + v[2] * r + v[3] * x;

function counterexampleExists(difference: Vector, model: ReturnType<typeof modelFromVisible>): boolean {
  for (let p = 20; p <= 100; p += 10) {
    for (let r = 25; r <= 105; r += 10) {
      for (let x = 35; x <= 95; x += 10) {
        const values = model.marked.map(name => valueAt(model.angles[name], p, r, x));
        if (values.some(v => v <= 0 || v >= 180) || new Set(values).size !== 5) continue;
        if (Math.abs(valueAt(difference, p, r, x)) > 1e-9) return true;
      }
    }
  }
  return false;
}

function diagramPoints(q: Visible, names: string[]): {points: Record<string, Point>; edges: [Point, Point][]} {
  const picture = q.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const edges: [Point, Point][] = [];
  for (const mark of picture.marks) {
    if (mark.kind === 'line') edges.push([[mark.x1, mark.y1], [mark.x2, mark.y2]]);
  }
  const vertices = [...new Map(edges.flat().map(point => [point.join(','), point])).values()];
  const points: Record<string, Point> = {};
  for (const name of names) {
    const label = picture.marks.find(mark => mark.kind === 'text' && mark.text === name);
    if (!label || label.kind !== 'text') throw new Error(`Missing vertex label ${name}`);
    const nearest = [...vertices].sort((u, v) =>
      Math.hypot(u[0] - label.x, u[1] - label.y) - Math.hypot(v[0] - label.x, v[1] - label.y),
    )[0];
    if (!nearest || Math.hypot(nearest[0] - label.x, nearest[1] - label.y) > 30) {
      throw new Error(`Detached vertex label ${name}`);
    }
    points[name] = nearest;
  }
  return {points, edges};
}

function angleSize(a: Point, vertex: Point, b: Point): number {
  const u = [a[0] - vertex[0], a[1] - vertex[1]];
  const v = [b[0] - vertex[0], b[1] - vertex[1]];
  const cosine = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}

const cases = Array.from({length: 40}, (_, i) => i - 10)
  .flatMap(seed => [0, 1, 7].map(index => ({seed, index})));

describe('geometric angle claims', () => {
  it('independently proves one visible choice and finds counterexamples to the others across seeds', () => {
    for (const {seed, index} of cases) {
      const q = makeRagQuestion(seed, index);
      const visible: Visible = {prompt: q.prompt, context: q.context, choices: q.choices, picture: q.picture};
      const model = modelFromVisible(visible);
      expect(visible.prompt).toBe('Which statement must be true?');
      expect(visible.choices).toHaveLength(4);
      expect(new Set(visible.choices).size).toBe(4);
      const results = visible.choices!.map(choice => ({choice, difference: equationDifference(choice, model.angles)}));
      const identities = results.filter(result => result.difference.every(coefficient => coefficient === 0));
      expect(identities).toHaveLength(1);
      expect(q.answer).toBe(identities[0].choice);
      for (const result of results) {
        if (result !== identities[0]) expect(counterexampleExists(result.difference, model)).toBe(true);
      }
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
      expect(q.unit).toBeUndefined();
    }
  });

  it('draws the stated straight-line orders and non-degenerate triangles with five different marked angles', () => {
    for (const {seed, index} of cases) {
      const q = makeRagQuestion(seed, index);
      const model = modelFromVisible(q);
      const {a, b, c, d} = model;
      const {points, edges} = diagramPoints(q, [a, b, c, d, 'O']);
      expect(new Set(Object.values(points).map(point => point.join(','))).size).toBe(5);
      for (const point of Object.values(points)) {
        expect(point[0]).toBeGreaterThan(0);
        expect(point[0]).toBeLessThan(320);
        expect(point[1]).toBeGreaterThan(0);
        expect(point[1]).toBeLessThan(200);
      }
      for (const [first, last] of [[a, d], [b, c]]) {
        const u = [points[first][0] - points.O[0], points[first][1] - points.O[1]];
        const v = [points[last][0] - points.O[0], points[last][1] - points.O[1]];
        expect(Math.abs(u[0] * v[1] - u[1] * v[0])).toBeLessThan(1e-7);
        expect(u[0] * v[0] + u[1] * v[1]).toBeLessThan(0);
      }
      const edgeKey = (u: Point, v: Point) => [u.join(','), v.join(',')].sort().join('|');
      const drawn = new Set(edges.map(([u, v]) => edgeKey(u, v)));
      for (const [u, v] of [[a, 'O'], ['O', d], [b, 'O'], ['O', c], [a, b], [c, d]]) {
        expect(drawn.has(edgeKey(points[u], points[v]))).toBe(true);
      }
      const sizes = model.marked.map(name => angleSize(points[name[0]], points[name[1]], points[name[2]]));
      for (let i = 0; i < sizes.length; i++) {
        expect(sizes[i]).toBeGreaterThan(0);
        expect(sizes[i]).toBeLessThan(180);
        for (let j = 0; j < i; j++) expect(Math.abs(sizes[i] - sizes[j])).toBeGreaterThan(0.5);
      }
    }
  });

  it('is deterministic and varies visible labels, choices and numerical distractors', () => {
    const variants = new Set<string>();
    const totals = new Set<string>();
    for (const {seed, index} of cases) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      variants.add(JSON.stringify([q.context, q.choices, q.picture]));
      for (const choice of q.choices ?? []) {
        const match = / = (\d+)°$/.exec(choice);
        if (match) totals.add(match[1]);
      }
    }
    expect(variants.size).toBeGreaterThan(30);
    expect(totals.size).toBeGreaterThan(1);
  });
});
