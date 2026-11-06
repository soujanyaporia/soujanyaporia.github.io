import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPercentageRepresentationConversions';

type Ratio = {n: number; d: number};
type Kind = 'decimal-percent' | 'percent-decimal' | 'percent-fraction' | 'complement-percent';
type Visible = Pick<Question, 'prompt' | 'display' | 'context'>;
type Solution = Ratio & {kind: Kind};
const seeds = [-103, -1, 0, ...Array.from({length: 96}, (_, i) => i + 1), 2147483647];

// This solver receives only the question text and displayed givens.
// It does not receive the answer, proof, seed or generator parameters.
function readDecimal(text: string): Ratio {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error(`Expected a decimal numeral: ${text}`);
  const digits = match[2] ?? '';
  return {n: Number(match[1] + digits), d: 10 ** digits.length};
}

function readPercentage(text: string): Ratio {
  if (!text.endsWith('%')) throw new Error('The visible percentage must include %.');
  return readDecimal(text.slice(0, -1));
}

function readAnswer(text: string): Ratio {
  const fraction = /^(\d+)\/([1-9]\d*)$/.exec(text);
  return fraction ? {n: Number(fraction[1]), d: Number(fraction[2])} : readDecimal(text);
}

function solveVisible(q: Visible): Solution {
  if (q.prompt === 'Choose the percentage that has the same value as this decimal.') {
    const value = readDecimal(q.display ?? '');
    return {kind: 'decimal-percent', n: value.n * 100, d: value.d};
  }
  if (q.prompt === 'Write this percentage using decimal notation.') {
    const value = readPercentage(q.display ?? '');
    return {kind: 'percent-decimal', n: value.n, d: value.d * 100};
  }
  if (q.prompt === 'Write this percentage as a fraction in its simplest form.') {
    const value = readPercentage(q.display ?? '');
    return {kind: 'percent-fraction', n: value.n, d: value.d * 100};
  }
  if (q.prompt === 'What percentage of the counters are yellow?') {
    const context = (q.context ?? []).join(' ');
    const match = /In a tray, (\d+)\/(\d+) of the counters are blue\. All the other counters are yellow\./.exec(context);
    if (!match) throw new Error('The complementary groups are not fully specified.');
    const blue = Number(match[1]);
    const whole = Number(match[2]);
    if (!(blue > 0 && blue < whole)) throw new Error('Expected a proper fraction.');
    return {kind: 'complement-percent', n: (whole - blue) * 100, d: whole};
  }
  throw new Error(`Unrecognised visible task: ${q.prompt}`);
}

function visible(q: Question): Visible {
  return {prompt: q.prompt, display: q.display, context: q.context};
}

// Trial divisors provide a separate reference method for simplest form.
function simplest(value: Ratio): string {
  for (let divisor = Math.min(value.n, value.d); divisor >= 1; divisor -= 1) {
    if (value.n % divisor === 0 && value.d % divisor === 0) {
      return `${value.n / divisor}/${value.d / divisor}`;
    }
  }
  throw new Error('No common divisor found.');
}

function sameValue(a: Ratio, b: Ratio): boolean {
  return a.n * b.d === b.n * a.d;
}

function questions(): Question[] {
  return seeds.flatMap(seed => Array.from({length: 8}, (_, index) => makeRagQuestion(seed, index)));
}

describe('percentage representation conversions', () => {
  it('solves all four variants independently from visible givens across varied seeds', () => {
    const kinds = new Set<Kind>();
    for (const q of questions()) {
      const expected = solveVisible(visible(q));
      kinds.add(expected.kind);
      expect(sameValue(readAnswer(q.answer), expected)).toBe(true);
      expect(q.picture).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
      expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation.length).toBeGreaterThan(0);
      if (expected.kind === 'percent-fraction') {
        expect(q.answer).toBe(simplest(expected));
        expect(q.requireSimplified).toBe(true);
      } else {
        expect(q.answer).toMatch(/^(0|[1-9]\d*)(?:\.\d+)?$/);
      }
      const percentageAnswer = expected.kind === 'decimal-percent' || expected.kind === 'complement-percent';
      expect(q.unit).toBe(percentageAnswer ? '%' : undefined);
      expect(expected.n / expected.d).toBeGreaterThan(0);
      expect(expected.n / expected.d).toBeLessThan(percentageAnswer ? 100 : 1);
    }
    expect([...kinds].sort()).toEqual(['complement-percent', 'decimal-percent', 'percent-decimal', 'percent-fraction']);
  });

  it('provides four distinct percentage choices with exactly one mathematically correct option', () => {
    const correctPositions = new Set<number>();
    for (const q of questions()) {
      const expected = solveVisible(visible(q));
      if (expected.kind !== 'decimal-percent') {
        expect(q.choices).toBeUndefined();
        continue;
      }
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      const correct = q.choices!.filter(option => sameValue(readDecimal(option), expected));
      expect(correct).toHaveLength(1);
      expect(correct[0]).toBe(q.answer);
      correctPositions.add(q.choices!.indexOf(correct[0]));
      const input = readDecimal(q.display!);
      expect(input.n).toBeGreaterThan(0);
      expect(input.n).toBeLessThan(input.d);
      expect((q.display!.split('.')[1] ?? '').length).toBeLessThanOrEqual(3);
      expect(q.display).not.toBe('0.64');
    }
    expect(correctPositions.size).toBeGreaterThan(1);
  });

  it('includes percentages below one and preserves leading zero place values without rounding', () => {
    let smallCases = 0;
    let wholeCases = 0;
    for (const q of questions()) {
      const expected = solveVisible(visible(q));
      if (expected.kind !== 'percent-decimal') continue;
      const given = readPercentage(q.display!);
      expect(q.display).not.toBe('6%');
      expect(q.display).not.toBe('0.5%');
      expect((q.answer.split('.')[1] ?? '').length).toBeLessThanOrEqual(3);
      if (given.n < given.d) {
        smallCases += 1;
        expect(q.answer).toMatch(/^0\.00[1-9]$/);
      } else {
        wholeCases += 1;
      }
      expect(sameValue(readDecimal(q.answer), expected)).toBe(true);
    }
    expect(smallCases).toBeGreaterThan(0);
    expect(wholeCases).toBeGreaterThan(0);
  });

  it('requires simplified fractions through the existing application checker', () => {
    let alreadySimplest = 0;
    let needsReduction = 0;
    for (const q of questions()) {
      const expected = solveVisible(visible(q));
      if (expected.kind !== 'percent-fraction') continue;
      const solution = simplest(expected);
      const [n, d] = solution.split('/').map(Number);
      expect(correctAnswer(q, solution)).toBe(true);
      expect(correctAnswer(q, `${n * 2}/${d * 2}`)).toBe(false);
      expect(correctAnswer(q, `${n + 1}/${d}`)).toBe(false);
      if (solution === `${expected.n}/${expected.d}`) alreadySimplest += 1;
      else needsReduction += 1;
    }
    expect(alreadySimplest).toBeGreaterThan(0);
    expect(needsReduction).toBeGreaterThan(0);
  });

  it('uses both parts of the whole when finding the complementary percentage', () => {
    const answers = new Set<string>();
    for (const q of questions()) {
      const expected = solveVisible(visible(q));
      if (expected.kind !== 'complement-percent') continue;
      const match = /(\d+)\/(\d+)/.exec(q.context![0])!;
      const blue = Number(match[1]);
      const whole = Number(match[2]);
      expect(100 % whole).toBe(0);
      expect(Number.isInteger(expected.n / expected.d)).toBe(true);
      expect(Number(q.answer) * whole + blue * 100).toBe(whole * 100);
      answers.add(q.answer);
    }
    expect(answers.size).toBeGreaterThan(10);
  });

  it('is deterministic and gives all four variants in every four-index cycle', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.PCT.02']);
    expect(RAG_PATTERN.canonicalPatternId).toBe('percentage-representation-conversions');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of seeds.slice(0, 16)) {
      const cycle = Array.from({length: 4}, (_, index) => makeRagQuestion(seed, index));
      expect(new Set(cycle.map(q => solveVisible(visible(q)).kind)).size).toBe(4);
      expect(new Set(cycle.map(q => q.key)).size).toBe(4);
      cycle.forEach((q, index) => expect(makeRagQuestion(seed, index)).toEqual(q));
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
