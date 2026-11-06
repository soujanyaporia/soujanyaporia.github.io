import { describe, expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragScaleOrOffsetKnownQuantity';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type VisibleModel = {
  letter: string;
  kind: 'older' | 'younger' | 'divide';
  probes: number[];
  solve: (value: number) => number;
};

function match(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Unrecognised visible statement: ${text}`);
  return result;
}

function only<T>(items: T[]): T {
  if (items.length !== 1) throw new Error(`Expected one solution, found ${items.length}`);
  return items[0]!;
}

function integers(low: number, high: number): number[] {
  return Array.from({ length: high - low + 1 }, (_, i) => low + i);
}

// The solver receives only displayed givens and the task, never answers,
// explanations, keys, random state, or generator parameters.
function readVisible(q: Visible): VisibleModel {
  if (q.context?.length !== 4) throw new Error('Four complete statements are required');
  const [first, second, third, fourth] = q.context;
  if (first!.startsWith('A tray contains ')) {
    const a = match(first!, /^A tray contains ([a-z]) ([a-z]+) beads\.$/);
    const b = match(second!, /^The number of ([a-z]+) beads is (\d+) times the number of ([a-z]+) beads\.$/);
    const c = match(third!, /^There are (\d+) more ([a-z]+) beads than ([a-z]+) beads\.$/);
    const d = match(fourth!, /^([a-z]) is a positive whole-number multiple of (\d+)\.$/);
    const letter = a[1]!;
    const factor = Number(b[2]);
    const difference = Number(c[1]);
    expect(a[2]).toBe(b[1]);
    expect(b[3]).toBe(c[3]);
    expect(d[1]).toBe(letter);
    expect(Number(d[2])).toBe(factor);
    expect(q.unit).toBe('beads');
    expect(q.prompt).toBe(`Which expression gives the number of ${c[2]} beads in terms of ${letter}?`);
    return {
      letter,
      kind: 'divide',
      probes: integers(1, 8).map(n => n * factor),
      solve(value) {
        if (value <= 0 || value % factor !== 0) throw new Error('Invalid visible count');
        // Search whole-number counts satisfying the two verbal relations.
        const middle = only(integers(0, value).filter(n => factor * n === value));
        return only(integers(0, value + difference).filter(n => n - middle === difference));
      },
    };
  }

  const a = match(first!, /^([A-Z][a-z]+)'s age is ([a-z]) years\.$/);
  const b = match(second!, /^([A-Z][a-z]+)'s age is (\d+) times ([A-Z][a-z]+)'s age\.$/);
  const c = match(third!, /^([A-Z][a-z]+) is (\d+) years (older|younger) than ([A-Z][a-z]+)\.$/);
  const d = match(fourth!, /^([a-z]) is a whole number from (\d+) to (\d+)\.$/);
  const letter = a[2]!;
  const factor = Number(b[2]);
  const difference = Number(c[2]);
  const kind = c[3] === 'older' ? 'older' : 'younger';
  const low = Number(d[2]);
  const high = Number(d[3]);
  expect(a[1]).toBe(b[3]);
  expect(b[1]).toBe(c[1]);
  expect(d[1]).toBe(letter);
  expect(q.unit).toBe('years');
  expect(q.prompt).toBe(`Write ${c[4]}'s age in terms of ${letter}. Put the letter term first, followed by + or - and the number. Type without spaces.`);
  return {
    letter,
    kind,
    probes: integers(low, high),
    solve(value) {
      if (!Number.isInteger(value) || value < low || value > high) throw new Error('Invalid visible age');
      const middle = factor * value;
      return only(integers(1, factor * high + difference).filter(target =>
        kind === 'older' ? middle - target === difference : target - middle === difference,
      ));
    },
  };
}

// A small test-only expression reader, independent of generation and grading.
function evaluate(expression: string, letter: string, value: number): number {
  const text = expression.replace(/\s+/g, '');
  const signed = (sign: string, n: string) => sign === '+' ? Number(n) : -Number(n);
  let m = /^(\d+)([a-z])([+-])(\d+)$/.exec(text);
  if (m) {
    if (m[2] !== letter) throw new Error('Wrong variable');
    return Number(m[1]) * value + signed(m[3]!, m[4]!);
  }
  m = /^([a-z])\/(\d+)([+-])(\d+)$/.exec(text);
  if (m) {
    if (m[1] !== letter) throw new Error('Wrong variable');
    return value / Number(m[2]) + signed(m[3]!, m[4]!);
  }
  m = /^\(([a-z])([+-])(\d+)\)\/(\d+)$/.exec(text);
  if (m) {
    if (m[1] !== letter) throw new Error('Wrong variable');
    return (value + signed(m[2]!, m[3]!)) / Number(m[4]);
  }
  throw new Error(`Unsupported expression: ${expression}`);
}

describe('scale or offset a known quantity', () => {
  it('independently solves visible relationships across varied seeds and indices', () => {
    const seeds = [...integers(0, 63), -1, -902, 2147483647, 4294967295];
    const modes = new Set<string>();
    const correctPositions = new Set<number>();
    for (const seed of seeds) {
      for (const index of [0, 1, 2]) {
        const q = makeRagQuestion(seed, index);
        const model = readVisible({ context: q.context, prompt: q.prompt, unit: q.unit });
        modes.add(model.kind);
        for (const value of model.probes) {
          const solved = model.solve(value);
          expect(Number.isInteger(solved)).toBe(true);
          expect(solved).toBeGreaterThan(0);
          if (model.kind !== 'divide') expect(solved).toBeLessThanOrEqual(81);
        }
        const options = q.choices;
        if (model.kind === 'divide') {
          if (!options) throw new Error('The count variant must offer choices');
          expect(options).toHaveLength(4);
          expect(new Set(options).size).toBe(4);
          const expected = only(options.filter(option => model.probes.every(value =>
            Math.abs(evaluate(option, model.letter, value) - model.solve(value)) < 1e-10,
          )));
          expect(q.answer).toBe(expected);
          correctPositions.add(options.indexOf(expected));
          for (const option of options) expect(correctAnswer(q, option)).toBe(option === expected);
        } else {
          expect(options).toBeUndefined();
          const first = model.probes[0]!;
          // Recover the affine expression from independently solved visible cases.
          const slope = model.solve(first + 1) - model.solve(first);
          const intercept = model.solve(first) - slope * first;
          const expected = `${slope}${model.letter}${intercept < 0 ? '-' : '+'}${Math.abs(intercept)}`;
          expect(q.answer).toBe(expected);
          expect(correctAnswer(q, expected)).toBe(true);
          const reversed = `${slope}${model.letter}${intercept < 0 ? '+' : '-'}${Math.abs(intercept)}`;
          expect(correctAnswer(q, reversed)).toBe(false);
          for (const value of model.probes) expect(evaluate(expected, model.letter, value)).toBe(model.solve(value));
        }
        expect(q.workedSteps).toHaveLength(2);
        expect(q.workedSteps!.every(step => step.text.length > 20 && Boolean(step.equation))).toBe(true);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect(q.picture).toBeUndefined();
      }
    }
    expect([...modes].sort()).toEqual(['divide', 'older', 'younger']);
    expect([...correctPositions].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is repeatable, varies its visible givens, and declares the intended curriculum family', () => {
    expect(makeRagQuestion(521)).toEqual(makeRagQuestion(521, 0));
    expect(makeRagQuestion(-47, 2)).toEqual(makeRagQuestion(-47, 2));
    const visible = new Set(integers(0, 63).map(seed => {
      const q = makeRagQuestion(seed);
      return JSON.stringify([q.context, q.prompt]);
    }));
    expect(visible.size).toBeGreaterThan(24);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-scale-or-offset-known-quantity');
    expect([...RAG_PATTERN.skillIds]).toEqual(['P6.S.ALG.01', 'P6.S.ALG.02']);
  });
});
