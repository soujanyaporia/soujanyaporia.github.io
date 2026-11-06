import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';
import {makeRagQuestion, RAG_PATTERN} from './ragIntersectingLineAngles';

type Visible = Pick<Question, 'context' | 'prompt' | 'picture'>;
type Fact = {from: string; to: string; value: number};

function diagramOf(q: Visible): Batch11UpperPicture {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  return q.picture;
}

function readVisible(q: Visible) {
  const diagram = diagramOf(q);
  const order = /moving clockwise: ([A-Z, ]+)\./.exec(diagram.label);
  if (!order) throw new Error('Missing accessible ray order');
  const rays = order[1].split(',').map(ray => ray.trim().slice(1));
  const text = (q.context ?? []).join(' ');
  const straight: Fact[] = Array.from(
    text.matchAll(/([A-Z]), O and ([A-Z]) form a straight line/g),
    match => ({from: match[1], to: match[2], value: 180}),
  );
  const given: Fact[] = Array.from(
    text.matchAll(/Angle ([A-Z])O([A-Z]) = (\d+)°/g),
    match => ({from: match[1], to: match[2], value: Number(match[3])}),
  );
  for (const match of text.matchAll(/Angle ([A-Z])O([A-Z]) is a right angle/g)) {
    given.push({from: match[1], to: match[2], value: 90});
  }
  const target = /angle ([A-Z])O([A-Z])/.exec(q.prompt);
  if (!target || straight.length !== 2) throw new Error('Missing visible angle constraints');
  if (new Set(rays).size !== rays.length) throw new Error('Repeated ray');
  return {diagram, rays, straight, given, target: {from: target[1], to: target[2]}};
}

function arc(rays: string[], from: string, to: string): number[] {
  const start = rays.indexOf(from), end = rays.indexOf(to);
  if (start < 0 || end < 0 || start === end) throw new Error('Invalid angle endpoints');
  const coefficients: number[] = Array(rays.length).fill(0);
  for (let i = start; i !== end; i = (i + 1) % rays.length) coefficients[i] = 1;
  return coefficients;
}

// Independent constraint solver: each consecutive sector is an unknown.
// It receives only pupil-visible text and the accessible diagram description.
// It cannot read answers, proofs, worked steps or generation parameters.
function solveVisible(q: Visible): number {
  const {rays, straight, given, target} = readVisible(q);
  const n = rays.length;
  const rows = [
    [...Array<number>(n).fill(1), 360],
    ...[...straight, ...given].map(fact => [...arc(rays, fact.from, fact.to), fact.value]),
  ];
  if (rows.length !== n) throw new Error('Unexpected constraint count');
  for (let column = 0; column < n; column++) {
    const pivot = rows.findIndex((row, i) => i >= column && Math.abs(row[column]) > 1e-9);
    if (pivot < 0) throw new Error('Visible givens do not determine every sector');
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    rows[column] = rows[column].map(value => value / divisor);
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = rows[row][column];
      rows[row] = rows[row].map((value, j) => value - factor * rows[column][j]);
    }
  }
  const sectors = rows.map(row => row[n]);
  if (sectors.some(value => value <= 0 || value >= 180)) throw new Error('Degenerate or reflex sector');
  return arc(rays, target.from, target.to).reduce((sum, coefficient, i) => sum + coefficient * sectors[i], 0);
}

function checkDrawnGeometry(q: Visible, expected: number) {
  const {diagram, rays, straight, given, target} = readVisible(q);
  const lines = diagram.marks.filter((mark): mark is Extract<Batch11UpperMark, {kind: 'line'}> => mark.kind === 'line');
  const labels = diagram.marks.filter((mark): mark is Extract<Batch11UpperMark, {kind: 'text'}> => mark.kind === 'text' && /^[A-Z]$/.test(mark.text) && mark.text !== 'O');
  expect(lines).toHaveLength(rays.length);
  expect(labels).toHaveLength(rays.length);
  const vectors = new Map<string, [number, number]>();
  for (const line of lines) {
    expect([line.x1, line.y1]).toEqual([160, 100]);
    const nearest = [...labels].sort((a, b) =>
      Math.hypot(a.x - line.x2, a.y - line.y2) - Math.hypot(b.x - line.x2, b.y - line.y2),
    )[0];
    if (!nearest) throw new Error('Unlabelled ray');
    expect(vectors.has(nearest.text)).toBe(false);
    vectors.set(nearest.text, [line.x2 - line.x1, line.y2 - line.y1]);
  }
  const vector = (name: string): [number, number] => {
    const result = vectors.get(name);
    if (!result) throw new Error('Missing drawn endpoint');
    return result;
  };
  const angle = (from: string, to: string): number => {
    const a = vector(from), b = vector(to);
    const cosine = (a[0] * b[0] + a[1] * b[1]) / (Math.hypot(...a) * Math.hypot(...b));
    return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
  };
  for (const fact of [...straight, ...given]) expect(angle(fact.from, fact.to)).toBeCloseTo(fact.value, 5);
  expect(angle(target.from, target.to)).toBeCloseTo(expected, 5);
  let turn = 0;
  for (let i = 0; i < rays.length; i++) {
    const a = vector(rays[i]), b = vector(rays[(i + 1) % rays.length]);
    turn += ((Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0])) * 180 / Math.PI + 360) % 360;
  }
  expect(turn).toBeCloseTo(360, 6);
  const degreeLabels = diagram.marks.flatMap(mark => mark.kind === 'text' && /^\d+°$/.test(mark.text) ? [Number(mark.text.slice(0, -1))] : []);
  expect(degreeLabels.sort((a, b) => a - b)).toEqual(given.filter(fact => fact.value !== 90).map(fact => fact.value).sort((a, b) => a - b));
  expect(diagram.marks.filter(mark => mark.kind === 'text' && mark.text === '?')).toHaveLength(1);
  const squareMarkers = diagram.marks.filter(mark => mark.kind === 'path' && !mark.d.includes(' A '));
  expect(squareMarkers).toHaveLength(given.some(fact => fact.value === 90) ? 1 : 0);
  for (const mark of diagram.marks) {
    if (mark.kind !== 'text') continue;
    expect(Number.isFinite(mark.x) && Number.isFinite(mark.y)).toBe(true);
    expect(mark.x).toBeGreaterThanOrEqual(5);
    expect(mark.x + mark.text.length * 11).toBeLessThan(320);
    expect(mark.y).toBeGreaterThanOrEqual(15);
    expect(mark.y).toBeLessThanOrEqual(195);
  }
}

function fixture(withRightAngle: boolean): Visible {
  return {
    prompt: 'Find the size of angle EOD.',
    context: [
      'A, O and B form a straight line. C, O and D form a straight line.',
      ...(withRightAngle
        ? ['Angle AOF is a right angle.', 'Angle FOC = 38°. Angle BOE = 29°.']
        : ['Angle AOC = 78°. Angle BOE = 31°.']),
    ],
    picture: {
      type: 'batch11-upper',
      label: `Starting at OA and moving clockwise: ${withRightAngle ? 'OA, OF, OC, OB, OE, OD' : 'OA, OC, OB, OE, OD'}.`,
      marks: [],
    },
  };
}

describe('intersecting-line angle calculation candidate', () => {
  it('solves independent visible fixtures and rejects insufficient givens', () => {
    expect(solveVisible(fixture(false))).toBe(47);
    expect(solveVisible(fixture(true))).toBe(99);
    const incomplete = fixture(false);
    incomplete.context = ['A, O and B form a straight line. C, O and D form a straight line.', 'Angle AOC = 78°.'];
    expect(() => solveVisible(incomplete)).toThrow();
  });

  it('independently solves varied seeds and verifies diagrams, choices and deterministic output', () => {
    const modes = new Set<string>();
    const visibleCases = new Set<string>();
    const seeds = [...Array.from({length: 192}, (_, i) => i - 40), 2147483647, 4294967295];
    for (const seed of seeds) for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const visible: Visible = {prompt: q.prompt, context: q.context, picture: q.picture};
      const expected = solveVisible(visible);
      expect(Number.isInteger(expected)).toBe(true);
      expect(expected).toBeGreaterThan(0);
      expect(expected).toBeLessThan(180);
      expect(q.answer).toBe(String(expected));
      expect(q.unit).toBe('degrees');
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));
      expect(makeRagQuestion(seed, index)).toEqual(q);
      checkDrawnGeometry(visible, expected);
      const rayCount = readVisible(visible).rays.length;
      if (rayCount === 6) expect(expected).toBeGreaterThan(90);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(value => Number(value) === expected)).toHaveLength(1);
        for (const value of q.choices) {
          expect(Number.isInteger(Number(value))).toBe(true);
          expect(Number(value)).toBeGreaterThan(0);
          expect(Number(value)).toBeLessThan(180);
        }
      }
      modes.add(`${rayCount}:${q.choices ? 'choice' : 'entry'}`);
      visibleCases.add(JSON.stringify(q.context));
    }
    expect([...modes].sort()).toEqual(['5:choice', '5:entry', '6:choice']);
    expect(visibleCases.size).toBeGreaterThan(40);
    expect(makeRagQuestion(7)).toEqual(makeRagQuestion(7, 0));
  });

  it('declares one level-5 family using the supplied angle skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('intersecting-line-angle-calculation');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.ANGLE.04']);
  });
});
