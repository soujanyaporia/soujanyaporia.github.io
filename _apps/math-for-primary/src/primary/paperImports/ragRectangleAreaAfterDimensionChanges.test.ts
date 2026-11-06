import {describe, expect, it} from 'vitest';
import {correctAnswer} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRectangleAreaAfterDimensionChanges';

type Rational = {n: number; d: number};
const NUMBER = '(?:\\d+ \\d+/\\d+|\\d+/\\d+|\\d+)';

function readNumber(text: string): Rational {
  if (/^\d+$/.test(text)) return {n: Number(text), d: 1};
  const match = /^(?:(\d+) )?(\d+)\/([1-9]\d*)$/.exec(text);
  if (!match) throw new Error(`Not an exact number: ${text}`);
  const d = Number(match[3]);
  return {n: Number(match[1] ?? 0) * d + Number(match[2]), d};
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function answerText(value: Rational): string {
  const factor = gcd(value.n, value.d);
  const n = value.n / factor;
  const d = value.d / factor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function sameValue(text: string, expected: Rational): boolean {
  const actual = readNumber(text);
  return actual.n * expected.d === expected.n * actual.d;
}

// Only pupil-visible context enters this solver. Count two horizontal strips,
// two vertical strips and four corner squares, independently of area subtraction.
function solveVisible(context: readonly string[]) {
  const text = context.join(' ');
  const dimensions = new RegExp('is (' + NUMBER + ') (cm|m) long and (' + NUMBER + ') \\2 wide\\.').exec(text);
  const border = new RegExp('The (?:path|border|walkway) is (' + NUMBER + ') (cm|m) wide').exec(text);
  if (!dimensions || !border || dimensions[2] !== border[2]) {
    throw new Error('Missing or inconsistent visible measurements');
  }
  const length = readNumber(dimensions[1]);
  const breadth = readNumber(dimensions[3]);
  const width = readNumber(border[1]);
  const scale = length.d * breadth.d * width.d;
  const x = length.n * (scale / length.d);
  const y = breadth.n * (scale / breadth.d);
  const z = width.n * (scale / width.d);
  const d = scale * scale;
  const stripsAndCorners = 2 * x * z + 2 * y * z + 4 * z * z;
  return {
    unit: dimensions[2],
    length: length.n / length.d,
    breadth: breadth.n / breadth.d,
    width: width.n / width.d,
    inner: {n: x * y, d},
    border: {n: stripsAndCorners, d},
    outer: {n: x * y + stripsAndCorners, d},
    widthAddedOnce: {n: x * z + y * z + z * z, d},
    stepValues: [
      {n: x * y, d},
      {n: 2 * z, d: scale},
      {n: x + 2 * z, d: scale},
      {n: y + 2 * z, d: scale},
      {n: x * y + stripsAndCorners, d},
      {n: stripsAndCorners, d},
    ],
  };
}

const seeds = [-2147483648, -7, -1, 0, 1, 2, 2147483647,
  ...Array.from({length: 40}, (_, i) => 17 + 101 * i)];

describe('rectangular border candidate', () => {
  it('independently solves all response forms from visible measurements across varied seeds', () => {
    for (const seed of seeds) for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(q.context ?? []);
      expect(solved.length).toBeGreaterThan(solved.breadth);
      expect(solved.breadth).toBeGreaterThan(0);
      expect(solved.width).toBeGreaterThan(0);
      expect(q.context?.[1]).toContain('all the way around the outside');
      expect(q.context?.[1]).toMatch(/rectangle|rectangular/);
      expect(solved.border.n).toBeGreaterThan(0);

      if (q.structuredResponse) {
        expect(q.structuredResponse).toEqual({
          kind: 'number-pair',
          firstLabel: '(a) Plot area (m²)',
          secondLabel: '(b) Walkway area (m²)',
        });
        expect(q.prompt).toContain('(a)');
        expect(q.prompt).toContain('(b)');
        expect(solved.unit).toBe('m');
        expect(solved.inner.n % solved.inner.d).toBe(0);
        expect(solved.border.n % solved.border.d).toBe(0);
        const actual: unknown = JSON.parse(q.answer);
        if (!Array.isArray(actual) || actual.length !== 2 || actual.some(v => typeof v !== 'string')) {
          throw new Error('Expected two numeric answer strings');
        }
        expect(sameValue(actual[0], solved.inner)).toBe(true);
        expect(sameValue(actual[1], solved.border)).toBe(true);
        const inner = answerText(solved.inner);
        const border = answerText(solved.border);
        expect(correctAnswer(q, JSON.stringify([inner, border]))).toBe(true);
        expect(correctAnswer(q, JSON.stringify([String(Number(inner) + 1), border]))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([inner, String(Number(border) + 1)]))).toBe(false);
      } else {
        expect(q.unit).toBe(`${solved.unit}²`);
        expect(sameValue(q.answer, solved.border)).toBe(true);
        expect(correctAnswer(q, answerText(solved.border))).toBe(true);
        expect(correctAnswer(q, answerText(solved.outer))).toBe(false);
        expect(correctAnswer(q, answerText(solved.widthAddedOnce))).toBe(false);
        if (q.choices) {
          expect(solved.unit).toBe('cm');
          expect(q.choices).toHaveLength(4);
          const normalised = q.choices.map(choice => answerText(readNumber(choice)));
          expect(new Set(normalised).size).toBe(4);
          expect(q.choices.filter(choice => sameValue(choice, solved.border))).toHaveLength(1);
          expect(q.choices).toContain(q.answer);
        } else {
          expect(q.requireSimplified).toBe(true);
          const actual = readNumber(q.answer);
          expect(gcd(actual.n, actual.d)).toBe(1);
          const expected = readNumber(answerText(solved.border));
          expect(correctAnswer(q, `${expected.n * 2}/${expected.d * 2}`)).toBe(false);
        }
      }
    }
  });

  it('gives worked-step results and units consistent with the visible rectangles', () => {
    for (let seed = 0; seed < 18; seed++) {
      const q = makeRagQuestion(seed);
      const solved = solveVisible(q.context ?? []);
      expect(q.workedSteps).toHaveLength(6);
      for (const [position, step] of (q.workedSteps ?? []).entries()) {
        expect(step.text.length).toBeGreaterThan(0);
        const result = new RegExp('= (' + NUMBER + ') (cm²|m²|cm|m)$').exec(step.equation ?? '');
        if (!result) throw new Error('Missing exact worked-step result and unit');
        expect(sameValue(result[1], solved.stepValues[position])).toBe(true);
        expect(result[2]).toBe([0, 4, 5].includes(position) ? `${solved.unit}²` : solved.unit);
        expect(q.explanation).toContain(step.equation);
      }
    }
  });

  it('is deterministic and varies the visible givens in each response form', () => {
    const contexts = new Map<string, Set<string>>();
    for (let seed = 0; seed < 48; seed++) for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      if (index === 0) expect(makeRagQuestion(seed)).toEqual(q);
      const form = q.structuredResponse ? 'linked' : q.choices ? 'choice' : 'entry';
      if (!contexts.has(form)) contexts.set(form, new Set());
      contexts.get(form)!.add(JSON.stringify(q.context));
    }
    expect([...contexts.keys()].sort()).toEqual(['choice', 'entry', 'linked']);
    for (const values of contexts.values()) expect(values.size).toBeGreaterThan(10);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-rectangle-area-after-dimension-changes');
  });
});
