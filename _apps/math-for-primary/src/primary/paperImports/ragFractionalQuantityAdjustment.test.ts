import {expect, test} from 'vitest';
import {correctAnswer, type Proof, type Question} from '../generate';
import {makeRagQuestion} from './ragFractionalQuantityAdjustment';

// This solver receives only pupil-visible text and units. It cannot access
// the stored answer, proof, key, random generator or generation parameters.
type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Rational = readonly [number, number];
type Kind = 'fraction-then-fixed' | 'reverse-fixed-then-fraction' | 'fixed-then-fraction' | 'fraction-plus-fixed';
type Solution = {
  kind: Kind;
  expected: Rational;
  initial: Rational;
  fixed: Rational;
  share: Rational;
  unit: 'm' | 'kg';
};
const TOKEN = '(\\d+(?: \\d+/\\d+|/\\d+)?)';
const ONE: Rational = [1, 1];

function readNumber(text: string): Rational {
  const m = /^(\d+)(?: (\d+))?\/(\d+)$/.exec(text);
  if (m) {
    const d = Number(m[3]);
    if (d <= 0) throw new Error('Invalid denominator');
    return m[2] === undefined ? [Number(m[1]), d] : [Number(m[1]) * d + Number(m[2]), d];
  }
  if (/^\d+$/.test(text)) return [Number(text), 1];
  throw new Error(`Invalid visible number: ${text}`);
}
function capture(line: string, before: string, after: string): Rational {
  const m = new RegExp(`^${before}${TOKEN}${after}$`).exec(line);
  if (!m) throw new Error(`Unexpected visible wording: ${line}`);
  return readNumber(m[1]);
}
const add = ([a, b]: Rational, [c, d]: Rational): Rational => [a * d + c * b, b * d];
const subtract = ([a, b]: Rational, [c, d]: Rational): Rational => [a * d - c * b, b * d];
const multiply = ([a, b]: Rational, [c, d]: Rational): Rational => [a * c, b * d];
const divide = ([a, b]: Rational, [c, d]: Rational): Rational => {
  if (c === 0) throw new Error('Cannot divide by zero');
  return [a * d, b * c];
};
const numeric = ([n, d]: Rational) => n / d;
const equal = ([a, b]: Rational, [c, d]: Rational) => a * d === c * b;

// Deliberately use a divisor search rather than the generator's reduction helper.
function reduced([n, d]: Rational): Rational {
  for (let factor = d; factor >= 2; factor -= 1) {
    if (n % factor === 0 && d % factor === 0) return [n / factor, d / factor];
  }
  return [n, d];
}
function canonical(input: Rational): string {
  const [n, d] = reduced(input);
  if (d === 1) return String(n);
  const whole = Math.floor(n / d);
  return whole ? `${whole} ${n % d}/${d}` : `${n}/${d}`;
}
function visible(q: Question): Visible {
  return {context: q.context?.slice(), prompt: q.prompt, unit: q.unit};
}

function solve(q: Visible): Solution {
  const lines = q.context;
  if (!lines || lines.length !== 3) throw new Error('Three complete visible givens are required');
  const [first, second, third] = lines;
  if (first.startsWith('A craft club has ')) {
    const initial = capture(first, 'A craft club has ', ' m of cord\\.');
    const share = capture(second, 'The club cuts off ', ' of the cord for a display\\.');
    const fixed = capture(third, 'It then cuts off another ', ' m for tags\\.');
    return {kind: 'fraction-then-fixed', expected: subtract(multiply(initial, subtract(ONE, share)), fixed), initial, fixed, share, unit: 'm'};
  }
  if (first.startsWith('Lina cuts ')) {
    const fixed = capture(first, 'Lina cuts ', ' m from a roll of ribbon to make a bow\\.');
    const share = capture(second, 'She then uses ', ' of the remaining ribbon to wrap gifts\\.');
    const final = capture(third, 'There is now ', ' m of ribbon left on the roll\\.');
    const initial = add(divide(final, subtract(ONE, share)), fixed);
    return {kind: 'reverse-fixed-then-fraction', expected: initial, initial, fixed, share, unit: 'm'};
  }
  if (first.startsWith('A sewing group starts with ')) {
    const initial = capture(first, 'A sewing group starts with ', ' m of fabric\\.');
    const fixed = capture(second, 'It cuts off ', ' m for flags\\.');
    const share = capture(third, 'It then uses ', ' of the remaining fabric for bunting\\.');
    return {kind: 'fixed-then-fraction', expected: multiply(subtract(initial, fixed), subtract(ONE, share)), initial, fixed, share, unit: 'm'};
  }
  if (first.startsWith('A food stall has ')) {
    const initial = capture(first, 'A food stall has ', ' kg of dried beans\\.');
    const share = capture(second, 'It packs ', ' of the beans into large bags\\.');
    const fixed = capture(third, 'It packs another ', ' kg into a small bag\\.');
    return {kind: 'fraction-plus-fixed', expected: add(multiply(initial, share), fixed), initial, fixed, share, unit: 'kg'};
  }
  throw new Error('Unrecognised visible problem');
}

function equationValue(expression: string): Rational {
  const operation = /^(.+) ([+−×]) (.+)$/.exec(expression);
  if (!operation) return readNumber(expression);
  const a = readNumber(operation[1]);
  const b = readNumber(operation[3]);
  if (operation[2] === '+') return add(a, b);
  if (operation[2] === '−') return subtract(a, b);
  return multiply(a, b);
}
function evaluateProof(proof: Proof): number {
  if (typeof proof === 'number') return proof;
  const a = evaluateProof(proof.a);
  const b = evaluateProof(proof.b);
  switch (proof.op) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case 'round': return Math.round(a / b) * b;
    case 'floor': return Math.floor(a / b) * b;
  }
}

const seeds = [0, -1, 2147483647, 4294967295, Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 40}, (_, i) => 1 + i * 7919)];

test('answers, units and bounds follow independently from visible givens across seeds and all four variants', () => {
  const kinds = new Set<Kind>();
  for (const seed of seeds) {
    const localKinds = new Set<Kind>();
    for (let index = 0; index < 8; index += 1) {
      const q = makeRagQuestion(seed, index);
      const solution = solve(visible(q));
      kinds.add(solution.kind);
      localKinds.add(solution.kind);
      expect(q.answer).toBe(canonical(solution.expected));
      expect(q.unit).toBe(solution.unit);
      expect(numeric(solution.expected)).toBeGreaterThan(0);
      expect(numeric(solution.fixed)).toBeGreaterThan(0);
      expect(numeric(solution.fixed)).toBeLessThan(numeric(solution.initial));
      expect(numeric(solution.share)).toBeGreaterThan(0);
      expect(numeric(solution.share)).toBeLessThan(1);
      expect(reduced(solution.fixed)[1]).toBeLessThanOrEqual(12);
      expect(reduced(solution.share)[1]).toBeLessThanOrEqual(12);
      expect(reduced(solution.expected)[1]).toBeLessThanOrEqual(60);
      expect(reduced(solution.expected)[1]).toBeGreaterThan(1);
      expect(q.requireSimplified).toBe(true);
      expect(q.requireMixed).toBe(numeric(solution.expected) > 1);
      expect(q.picture).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();

      if (solution.kind === 'reverse-fixed-then-fraction') {
        expect(reduced(subtract(ONE, solution.share))[0]).toBe(1);
        const end = capture(q.context![2], 'There is now ', ' m of ribbon left on the roll\\.');
        const reconstructed = multiply(subtract(solution.expected, solution.fixed), subtract(ONE, solution.share));
        expect(equal(reconstructed, end)).toBe(true);
        expect(q.prompt).toContain('at the start');
      } else {
        expect(numeric(solution.expected)).toBeLessThan(numeric(solution.initial));
      }

      if (solution.kind === 'fraction-plus-fixed') {
        expect(q.choices).toHaveLength(4);
        const options = q.choices!.map(readNumber);
        expect(new Set(options.map(canonical)).size).toBe(4);
        expect(options.filter(option => equal(option, solution.expected))).toHaveLength(1);
        for (const option of options) {
          expect(numeric(option)).toBeGreaterThan(0);
          expect(numeric(option)).toBeLessThan(numeric(solution.initial));
        }
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
    expect(localKinds.size).toBe(4);
  }
  expect([...kinds].sort()).toEqual([
    'fixed-then-fraction', 'fraction-plus-fixed', 'fraction-then-fixed', 'reverse-fixed-then-fraction',
  ]);
});

test('worked equations are true and proof trees agree with the visible-givens solution', () => {
  for (const seed of seeds.slice(0, 16)) {
    for (let index = 0; index < 4; index += 1) {
      const q = makeRagQuestion(seed, index);
      const solution = solve(visible(q));
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
      expect(q.hint.length).toBeGreaterThan(20);
      for (const step of q.workedSteps ?? []) {
        expect(step.text.length).toBeGreaterThan(10);
        if (!step.equation) throw new Error('A worked calculation is missing');
        const sides = step.equation.split(' = ');
        expect(sides).toHaveLength(2);
        expect(equal(equationValue(sides[0]), equationValue(sides[1]))).toBe(true);
        expect(q.explanation).toContain(step.equation);
      }
      const finalEquation = q.workedSteps![q.workedSteps!.length - 1].equation!;
      expect(equal(equationValue(finalEquation.split(' = ')[1]), solution.expected)).toBe(true);
      if (q.proof === undefined) throw new Error('Proof is missing');
      expect(evaluateProof(q.proof)).toBeCloseTo(numeric(solution.expected), 10);
    }
  }
});

test('the application accepts independently solved answers and rejects wrong or disallowed forms', () => {
  for (const seed of seeds.slice(0, 12)) {
    for (let index = 0; index < 4; index += 1) {
      const q = makeRagQuestion(seed, index);
      const expected = solve(visible(q)).expected;
      const text = canonical(expected);
      expect(correctAnswer(q, text)).toBe(true);
      expect(correctAnswer(q, canonical(add(expected, ONE)))).toBe(false);
      const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(text);
      if (mixed) {
        const whole = Number(mixed[1]);
        const numerator = Number(mixed[2]);
        const denominator = Number(mixed[3]);
        expect(correctAnswer(q, `${whole} ${numerator * 2}/${denominator * 2}`)).toBe(false);
        expect(correctAnswer(q, `${whole * denominator + numerator}/${denominator}`)).toBe(false);
        expect(correctAnswer(q, String(numeric(expected)))).toBe(false);
      } else {
        const proper = /^(\d+)\/(\d+)$/.exec(text);
        if (!proper) throw new Error('Expected a non-whole fractional answer');
        expect(correctAnswer(q, `${Number(proper[1]) * 2}/${Number(proper[2]) * 2}`)).toBe(false);
      }
    }
  }
});

test('generation is deterministic, index-sensitive and numerically varied', () => {
  const visibleQuestions = new Set<string>();
  const keys = new Set<string>();
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  for (const seed of seeds.slice(0, 12)) {
    for (let index = 0; index < 4; index += 1) {
      const first = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(first);
      visibleQuestions.add(JSON.stringify(visible(first)));
      keys.add(first.key);
    }
  }
  expect(keys.size).toBe(48);
  expect(visibleQuestions.size).toBeGreaterThan(24);
});
