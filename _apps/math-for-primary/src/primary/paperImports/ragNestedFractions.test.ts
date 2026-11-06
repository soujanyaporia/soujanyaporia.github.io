import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragNestedFractions';

type Fraction = {n: number; d: number};
type Visible = {context: string[]; prompt: string; unit?: string};
type Solution = {
  kind: 'count' | 'liquid' | 'linked';
  expected: string;
  total: Fraction;
  first: Fraction;
  second: Fraction;
  take1: Fraction;
  take2: Fraction;
  left: Fraction;
};

// Independent arithmetic: subtract the actual quantities taken at each stage.
// No production fraction helper, random parameters, answers or worked steps are read.
function rat(n: number, d: number): Fraction {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d <= 0) throw new Error('Invalid rational');
  let x = Math.abs(n), y = d;
  while (y !== 0) { const next = x % y; x = y; y = next; }
  return {n: n / x, d: d / x};
}
const times = (x: Fraction, y: Fraction) => rat(x.n * y.n, x.d * y.d);
const minus = (x: Fraction, y: Fraction) => rat(x.n * y.d - y.n * x.d, x.d * y.d);
const text = (x: Fraction) => x.d === 1 ? String(x.n) : `${x.n}/${x.d}`;
const value = (x: Fraction) => x.n / x.d;
function match(line: string | undefined, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(line ?? '');
  if (!result) throw new Error(`Missing visible given: ${pattern}`);
  return result;
}
function readFraction(line: string | undefined, pattern: RegExp): Fraction {
  const result = match(line, pattern);
  return rat(Number(result[1]), Number(result[2]));
}
const readCount = (line: string | undefined, pattern: RegExp) => Number(match(line, pattern)[1]);
const visible = (q: Question): Visible => ({context: q.context ?? [], prompt: q.prompt, unit: q.unit});

function solveVisible(question: Visible): Solution {
  const lines = question.context;
  let kind: Solution['kind'];
  let total: Fraction;
  let first: Fraction;
  let second: Fraction;
  let added = 0;
  if (question.prompt.startsWith('(a)')) {
    kind = 'linked';
    first = readFraction(lines[1], /gave (\d+)\/(\d+) of these flowers/);
    second = readFraction(lines[2], /gave (\d+)\/(\d+) of the flowers still left/);
    added = readCount(lines[3], /made (\d+) more flowers/);
    const increase = readCount(lines[4], /now (\d+) more flowers left/);
    // Any possible first batch loses at least its first gift. This gives a
    // finite search bound derived entirely from the visible information.
    const upper = Math.floor((added - increase) * first.d / first.n);
    const possible: number[] = [];
    for (let start = 1; start <= upper; start++) {
      const gift1 = start * first.n / first.d;
      const gift2 = (start - gift1) * second.n / second.d;
      if (!Number.isInteger(gift1) || !Number.isInteger(gift2)) continue;
      if (start - gift1 - gift2 + added === start + increase) possible.push(start);
    }
    if (possible.length !== 1) throw new Error(`Expected one whole-number solution, found ${possible.length}`);
    total = rat(possible[0]!, 1);
  } else if (question.unit === 'L') {
    kind = 'liquid';
    total = readFraction(lines[0], /poured (\d+)\/(\d+) L of berry drink/);
    first = readFraction(lines[1], /poured (\d+)\/(\d+) of the drink into cups/);
    second = readFraction(lines[2], /poured (\d+)\/(\d+) of the drink still in the jug/);
  } else {
    kind = 'count';
    if (question.unit !== 'beads' || !question.prompt.includes('green bag')) throw new Error('Unknown response task');
    total = rat(readCount(lines[0], /There are (\d+) beads on a tray/), 1);
    first = readFraction(lines[1], /moved (\d+)\/(\d+) of the beads into a red bag/);
    second = readFraction(lines[2], /moved (\d+)\/(\d+) of the beads still on the tray/);
  }
  const take1 = times(total, first);
  const afterFirst = minus(total, take1);
  const take2 = times(afterFirst, second);
  const left = minus(afterFirst, take2);
  let expected = text(kind === 'liquid' ? take2 : left);
  if (kind === 'linked') {
    const removed = minus(total, left);
    const fractionRemoved = rat(removed.n * total.d, removed.d * total.n);
    expected = JSON.stringify([String(fractionRemoved.n), String(fractionRemoved.d), String(total.n + added)]);
  }
  return {kind, expected, total, first, second, take1, take2, left};
}

describe('nested fractions and successive remainders candidate', () => {
  test('the visible-givens solver handles independently calculated examples', () => {
    expect(solveVisible({
      unit: 'beads', prompt: 'How many beads went into the green bag?',
      context: ['There are 180 beads on a tray.', 'Mei moved 1/3 of the beads into a red bag.', 'Then Mei moved 3/4 of the beads still on the tray into a blue bag.'],
    }).expected).toBe('30');
    expect(solveVisible({
      unit: 'L', prompt: 'How much drink entered the flask?',
      context: ['Dev poured 4/5 L of berry drink into an empty jug.', 'First, Dev poured 1/4 of the drink into cups.', 'Then Dev poured 4/5 of the drink still in the jug into a flask.'],
    }).expected).toBe('12/25');
    expect(solveVisible({
      prompt: '(a) Find the fraction given away. (b) Find the total made.',
      context: ['Lina made some paper flowers.', 'Lina gave 1/3 of these flowers to one class.', 'Then Lina gave 3/4 of the flowers still left to another class.', 'Lina made 67 more flowers.', 'There were now 7 more flowers left than at first.'],
    }).expected).toBe('["5","6","139"]');
  });

  test('solves every template from visible givens across varied seeds and indices', () => {
    const seeds = [-997, -1, 0, 1, 19, 73, 2147483647, 4294967295, ...Array.from({length: 80}, (_, i) => i * 29 + 7)];
    const seen = new Map<string, Set<string>>();
    for (const seed of seeds) {
      const perSeed = new Set<string>();
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        expect(q.answer).toBe(solved.expected);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        perSeed.add(solved.kind);
        if (!seen.has(solved.kind)) seen.set(solved.kind, new Set());
        seen.get(solved.kind)!.add(JSON.stringify(q.context));
        for (const f of [solved.first, solved.second]) {
          expect(f.n).toBeGreaterThan(0);
          expect(f.n).toBeLessThan(f.d);
          expect(f.d).toBeLessThanOrEqual(12);
        }
        expect(value(solved.left)).toBeGreaterThan(0);
        expect(value(solved.take2)).toBeLessThan(value(minus(solved.total, solved.take1)));
        expect(value(solved.take1) + value(solved.take2) + value(solved.left)).toBeCloseTo(value(solved.total), 10);
        if (solved.kind !== 'liquid') {
          for (const amount of [solved.total, solved.take1, solved.take2, solved.left]) expect(amount.d).toBe(1);
          expect(solved.total.n).toBeLessThanOrEqual(500);
        } else {
          expect(value(solved.total)).toBeLessThan(1);
          expect(q.requireSimplified).toBe(true);
          expect(q.answer).toMatch(/^\d+\/\d+$/);
          expect(q.prompt).toContain('in litres');
        }
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => Boolean(step.text && step.equation))).toBe(true);
        const finalAnswer = solved.kind === 'linked' ? (JSON.parse(solved.expected) as string[])[2]! : solved.expected;
        expect(q.workedSteps!.at(-1)!.equation).toContain(finalAnswer);
      }
      expect(perSeed.size).toBe(3);
    }
    expect([...seen.keys()].sort()).toEqual(['count', 'linked', 'liquid']);
    for (const variants of seen.values()) expect(variants.size).toBeGreaterThan(20);
  });

  test('retains and grades both linked parts with supported number fields', () => {
    for (let seed = 0; seed < 12; seed++) {
      const q = [0, 1, 2].map(index => makeRagQuestion(seed, index)).find(question => question.structuredResponse)!;
      const solved = solveVisible(visible(q));
      const spec = q.structuredResponse!;
      expect(solved.kind).toBe('linked');
      expect(spec.kind).toBe('number-fields');
      if (spec.kind !== 'number-fields') throw new Error('Expected supported number fields');
      expect(spec.fields.map(field => field.label)).toEqual(['(a) Numerator', '(a) Denominator', '(b) Total flowers made']);
      expect(q.prompt).toContain('simplest form');
      expect(structuredResponseReady(spec, solved.expected)).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, solved.expected)).toBe(true);
      const parts = JSON.parse(solved.expected) as string[];
      for (let field = 0; field < 3; field++) {
        const wrong = [...parts];
        wrong[field] = String(Number(wrong[field]) + 1);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
      }
      const unsimplified = [String(Number(parts[0]) * 2), String(Number(parts[1]) * 2), parts[2]];
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(unsimplified))).toBe(false);
      expect(structuredResponseReady(spec, JSON.stringify(parts.slice(0, 2)))).toBe(false);
    }
  });

  test('exports the required family metadata and supports the default index', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('nested-fractions-and-successive-remainders');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.05', 'P5.S.FRAC.06']);
    expect(makeRagQuestion(41)).toEqual(makeRagQuestion(41, 0));
  });
});
