import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion, RAG_PATTERN} from './ragIntersectingLineRelationships';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'choices'>;
type TextMark = Extract<Batch11UpperMark, {kind: 'text'}>;
type Fact = {from: string; to: string; degrees: number};

function visibleFacts(q: Visible) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Expected supported crossing diagram');
  const order = /Clockwise order of rays: ([A-Z, ]+)\./.exec(q.picture.label);
  if (!order) throw new Error('Missing accessible ray order');
  const names = order[1].split(', ').map(name => name.slice(1));
  const text = (q.context ?? []).join(' ');
  const straight: Fact[] = [...text.matchAll(/([A-Z]), O and ([A-Z]) are on a straight line/g)]
    .map(m => ({from: m[1], to: m[2], degrees: 180}));
  const given: Fact[] = [...text.matchAll(/Angle ([A-Z])O([A-Z]) is (\d+)°/g)]
    .map(m => ({from: m[1], to: m[2], degrees: Number(m[3])}));
  const right: Fact[] = [...text.matchAll(/Angle ([A-Z])O([A-Z]) is a right angle/g)]
    .map(m => ({from: m[1], to: m[2], degrees: 90}));
  if (straight.length !== 2 || new Set(names).size !== 5) throw new Error('Incomplete crossing');
  const coefficients = (from: string, to: string) => {
    const start = names.indexOf(from), end = names.indexOf(to);
    if (start < 0 || end < 0 || start === end) throw new Error('Bad angle endpoints');
    const row = names.map(() => 0);
    for (let i = start; i !== end; i = (i + 1) % names.length) row[i] = 1;
    return row;
  };
  const labels = new Map([...q.picture.label.matchAll(/([a-z]) = ([A-Z])O([A-Z])/g)]
    .map(m => [m[1], coefficients(m[2], m[3])] as const));
  return {picture: q.picture, names, straight, given, right, coefficients, labels};
}

// Each sector between consecutive visible rays is an unknown. Row reduction
// uses only straight-line facts, a full turn, and the stated angle sizes.
function equationSystem(q: Visible) {
  const facts = visibleFacts(q), n = facts.names.length;
  const rows = [
    [...Array<number>(n).fill(1), 360],
    ...[...facts.straight, ...facts.given, ...facts.right]
      .map(f => [...facts.coefficients(f.from, f.to), f.degrees]),
  ];
  let next = 0;
  const pivots: {row: number[]; column: number}[] = [];
  for (let col = 0; col < n; col++) {
    const found = rows.findIndex((row, i) => i >= next && Math.abs(row[col]) > 1e-9);
    if (found < 0) continue;
    [rows[next], rows[found]] = [rows[found], rows[next]];
    const divisor = rows[next][col];
    rows[next] = rows[next].map(value => value / divisor);
    for (let i = next + 1; i < rows.length; i++) {
      const factor = rows[i][col];
      rows[i] = rows[i].map((value, j) => value - factor * rows[next][j]);
    }
    pivots.push({row: rows[next], column: col});
    next++;
  }
  const reduce = (equation: number[]) => {
    let residual = equation.slice();
    for (const {row, column} of pivots) {
      const factor = residual[column];
      residual = residual.map((value, i) => value - factor * row[i]);
    }
    return residual;
  };
  return {...facts, n, reduce};
}

function solveVisible(q: Visible): string {
  const system = equationSystem(q);
  const target = /size of angle ([A-Z])O([A-Z])/.exec(q.prompt);
  if (target) {
    const residual = system.reduce([...system.coefficients(target[1], target[2]), 0]);
    if (residual.slice(0, system.n).some(value => Math.abs(value) > 1e-8)) {
      throw new Error('Visible givens do not determine the requested angle');
    }
    const result = -residual[system.n];
    if (Math.abs(result - Math.round(result)) > 1e-8 || result <= 0 || result >= 180) {
      throw new Error('Invalid primary-level angle');
    }
    return String(Math.round(result));
  }
  const expression = (text: string) => {
    const row = Array<number>(system.n + 1).fill(0);
    for (const term of text.split(' + ')) {
      if (/^\d+°$/.test(term)) row[system.n] -= Number(term.slice(0, -1));
      else {
        const coefficients = system.labels.get(term.replace('∠', ''));
        if (!coefficients) throw new Error('Unknown visible angle label');
        coefficients.forEach((value, i) => { row[i] += value; });
      }
    }
    return row;
  };
  const justified = (q.choices ?? []).filter(choice => {
    const [left, right] = choice.split(' = ');
    if (!right) throw new Error('Malformed statement');
    const a = expression(left), b = expression(right);
    return system.reduce(a.map((value, i) => value - b[i])).every(value => Math.abs(value) < 1e-8);
  });
  if (justified.length !== 1) throw new Error('Expected exactly one entailed statement');
  return justified[0];
}

function checkGeometry(q: Visible) {
  const f = visibleFacts(q);
  const lines = f.picture.marks.filter(mark => mark.kind === 'line');
  const labels = f.picture.marks.filter((mark): mark is TextMark => mark.kind === 'text' && /^[A-Z]$/.test(mark.text) && mark.text !== 'O');
  expect(lines).toHaveLength(5);
  expect(labels).toHaveLength(5);
  const directions = new Map<string, number>();
  for (const line of lines) {
    const label = labels.slice().sort((a, b) =>
      Math.hypot(a.x - line.x2, a.y - line.y2) - Math.hypot(b.x - line.x2, b.y - line.y2))[0];
    expect(directions.has(label.text)).toBe(false);
    directions.set(label.text, Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180 / Math.PI);
  }
  const sectors = f.names.map((name, i) =>
    (directions.get(f.names[(i + 1) % f.names.length])! - directions.get(name)! + 360) % 360);
  expect(sectors.reduce((a, b) => a + b, 0)).toBeCloseTo(360, 7);
  expect(Math.min(...sectors)).toBeGreaterThan(20);
  for (const fact of [...f.straight, ...f.given, ...f.right]) {
    const drawn = f.coefficients(fact.from, fact.to).reduce((sum, c, i) => sum + c * sectors[i], 0);
    expect(drawn).toBeCloseTo(fact.degrees, 7);
  }
  const target = /size of angle ([A-Z])O([A-Z])/.exec(q.prompt);
  if (target) {
    const drawn = f.coefficients(target[1], target[2]).reduce((sum, c, i) => sum + c * sectors[i], 0);
    expect(drawn).toBeCloseTo(Number(solveVisible(q)), 7);
  }
  const degreeLabels = f.picture.marks.filter((mark): mark is TextMark => mark.kind === 'text' && /^\d+°$/.test(mark.text)).map(mark => mark.text).sort();
  expect(degreeLabels).toEqual(f.given.map(fact => `${fact.degrees}°`).sort());
  const squares = f.picture.marks.filter(mark => mark.kind === 'path' && !mark.d.includes(' A '));
  expect(squares).toHaveLength(f.right.length);
  const unknowns = f.picture.marks.filter((mark): mark is TextMark => mark.kind === 'text' && mark.text === '?');
  expect(unknowns).toHaveLength(target ? 1 : 0);
  for (const mark of f.picture.marks) {
    if (mark.kind === 'text') {
      expect(mark.x).toBeGreaterThan(8);
      expect(mark.x).toBeLessThan(295);
      expect(mark.y).toBeGreaterThan(8);
      expect(mark.y).toBeLessThan(198);
    }
  }
}

describe('intersecting-line relationships', () => {
  it('solves all variants from visible constraints across seeds and indices', () => {
    const variants = new Set<string>(), statements = new Set<string>(), givens = new Set<string>();
    for (let seed = -12; seed < 72; seed++) {
      for (let index = 0; index < 5; index++) {
        const q = makeRagQuestion(seed, index);
        // No answer, explanation, worked steps or private parameters reach the solver.
        const visible: Visible = {prompt: q.prompt, context: q.context, picture: q.picture, choices: q.choices};
        const expected = solveVisible(visible);
        expect(q.answer).toBe(expected);
        checkGeometry(visible);
        variants.add(q.prompt);
        givens.add(JSON.stringify(q.context));
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
        }
        if (q.prompt === 'Which statement must be true?') {
          statements.add(expected);
          expect(q.unit).toBe(undefined);
        } else {
          expect(q.unit).toBe('degrees');
        }
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(makeRagQuestion(seed, index)).toEqual(q);
      }
    }
    expect(variants.size).toBe(3);
    expect(statements.size).toBe(2);
    expect(givens.size).toBeGreaterThan(40);
  });

  it('exposes one P6 family with curriculum angle skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('intersecting-line-angle-relationships');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.ANGLE.04']);
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
    expect(makeRagQuestion(17, 0).key).not.toBe(makeRagQuestion(17, 1).key);
  });
});
