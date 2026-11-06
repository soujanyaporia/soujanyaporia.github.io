import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragEqualProportionalRemainders';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solution = {
  kind: 'total' | 'difference' | 'known-remainder' | 'money';
  expected: number;
  first: number;
  second: number;
  firstLeft: number;
  secondLeft: number;
  multiplier: number;
};

function capture(pattern: RegExp, text: string): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern.source}`);
  return match.slice(1);
}

// This solver receives only pupil-visible fields. It derives and solves the
// balance equations; it does not import generation tables or inspect answers.
function solveVisible(question: Visible): Solution {
  const text = (question.context ?? []).join('\n');
  if (/^Iman and Lucas had /m.test(text)) {
    const total = Number(capture(/^Iman and Lucas had \$(\d+) between them before a visit to the bookshop\.$/m, text)[0]);
    const spending = capture(/^Iman spent (\d+)\/(\d+) of his money\. Lucas spent \$(\d+)\.$/m, text);
    const numerator = Number(spending[0]);
    const denominator = Number(spending[1]);
    const fixed = Number(spending[2]);
    const multiplier = Number(capture(/^Lucas then had (\d+) times as much money left as Iman\.$/m, text)[0]);
    if (!(numerator > 0 && numerator < denominator && denominator <= 8 && fixed > 0 && multiplier > 1)) {
      throw new Error('Invalid visible money constraints.');
    }
    if (question.unit !== 'dollars' || question.prompt !== 'How much more money did Lucas have than Iman before the visit?') {
      throw new Error('Unexpected money response target.');
    }
    // If Iman starts with x, Lucas starts with total-x.
    // denominator*(total-x-fixed) = multiplier*(denominator-numerator)*x.
    const coefficient = denominator + multiplier * (denominator - numerator);
    if (coefficient <= 0) throw new Error('The starting amount is not uniquely determined.');
    const first = denominator * (total - fixed) / coefficient;
    const second = total - first;
    return {
      kind: 'money', expected: second - first, first, second,
      firstLeft: first * (denominator - numerator) / denominator,
      secondLeft: second - fixed, multiplier,
    };
  }

  if (question.unit !== 'beads') throw new Error('Unexpected count unit.');
  const fractions = capture(/^(\d+)\/(\d+) of the red beads and (\d+)\/(\d+) of the blue beads were used\.$/m, text);
  const redSpent = Number(fractions[0]);
  const redDenominator = Number(fractions[1]);
  const blueSpent = Number(fractions[2]);
  const blueDenominator = Number(fractions[3]);
  if (!(redSpent > 0 && redSpent < redDenominator && redDenominator <= 8 && blueSpent > 0 && blueSpent < blueDenominator && blueDenominator <= 8)) {
    throw new Error('Invalid visible bead fractions.');
  }
  // Equal remainders give p*red = q*blue after clearing denominators.
  const p = (redDenominator - redSpent) * blueDenominator;
  const q = (blueDenominator - blueSpent) * redDenominator;
  let first: number;
  let second: number;
  let kind: Solution['kind'];
  if (/^A craft box held /m.test(text)) {
    const total = Number(capture(/^A craft box held (\d+) red and blue beads altogether\.$/m, text)[0]);
    first = q * total / (p + q);
    second = total - first;
    kind = 'total';
  } else if (/^Before a lesson,/m.test(text)) {
    const difference = Number(capture(/^Before a lesson, a box held (\d+) more red beads than blue beads\.$/m, text)[0]);
    if (q <= p) throw new Error('The stated positive difference is impossible or underdetermined.');
    first = q * difference / (q - p);
    second = first - difference;
    kind = 'difference';
  } else {
    const left = Number(capture(/^Afterwards, there were (\d+) blue beads left and the same number of red beads left\.$/m, text)[0]);
    first = left * redDenominator / (redDenominator - redSpent);
    second = left * blueDenominator / (blueDenominator - blueSpent);
    kind = 'known-remainder';
  }
  if (kind !== 'known-remainder' && !text.includes('The numbers of red and blue beads left were equal.')) {
    throw new Error('Missing equal-remainder constraint.');
  }
  const expectedPrompt = kind === 'known-remainder'
    ? 'How many beads were in the box before any were used?'
    : 'How many red beads were in the box before any were used?';
  if (question.prompt !== expectedPrompt) throw new Error('Unexpected count response target.');
  return {
    kind, expected: kind === 'known-remainder' ? first + second : first,
    first, second,
    firstLeft: first * (redDenominator - redSpent) / redDenominator,
    secondLeft: second * (blueDenominator - blueSpent) / blueDenominator,
    multiplier: 1,
  };
}

function visibleOnly(question: Question): Visible {
  return {context: question.context?.slice(), prompt: question.prompt, unit: question.unit};
}

describe('equal or proportional remainders candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    const removal = '1/2 of the red beads and 1/4 of the blue beads were used.';
    const equal = 'The numbers of red and blue beads left were equal.';
    const redPrompt = 'How many red beads were in the box before any were used?';
    expect(solveVisible({
      context: ['A craft box held 150 red and blue beads altogether.', removal, equal],
      prompt: redPrompt, unit: 'beads',
    }).expected).toBe(90);
    expect(solveVisible({
      context: ['Before a lesson, a box held 30 more red beads than blue beads.', removal, equal],
      prompt: redPrompt, unit: 'beads',
    }).expected).toBe(90);
    expect(solveVisible({
      context: ['A craft box contained red and blue beads.', removal, 'Afterwards, there were 45 blue beads left and the same number of red beads left.'],
      prompt: 'How many beads were in the box before any were used?', unit: 'beads',
    }).expected).toBe(150);
    expect(solveVisible({
      context: [
        'Iman and Lucas had $328 between them before a visit to the bookshop.',
        'Iman spent 2/5 of his money. Lucas spent $48.',
        'Lucas then had 3 times as much money left as Iman.',
      ],
      prompt: 'How much more money did Lucas have than Iman before the visit?', unit: 'dollars',
    }).expected).toBe(128);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [
      -2147483648, -1009, -17, -1, 0, 1, 2, 3, 17, 97, 99991, 2147483647,
      ...Array.from({length: 64}, (_, i) => 101 * i + 5),
    ];
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      for (const index of [0, 1, 2, 3, 4, 9, 31]) {
        const question = makeRagQuestion(seed, index);
        const visible = visibleOnly(question);
        const result = solveVisible(visible);
        kinds.add(result.kind);
        visibleQuestions.add(JSON.stringify(visible));
        expect(Number(question.answer)).toBe(result.expected);
        expect(result.expected).toBeGreaterThan(0);
        expect(result.secondLeft).toBe(result.multiplier * result.firstLeft);
        for (const value of [result.first, result.second, result.firstLeft, result.secondLeft]) {
          expect(Number.isSafeInteger(value)).toBe(true);
          expect(value).toBeGreaterThan(0);
        }
        expect(result.firstLeft).toBeLessThan(result.first);
        expect(result.secondLeft).toBeLessThan(result.second);
        expect(result.first + result.second).toBeLessThanOrEqual(729);
        expect(question.answer).toMatch(result.kind === 'money' ? /^\d+\.00$/ : /^\d+$/);
        expect(question.choices).toBeUndefined();
        expect(question.picture).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(question.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
      }
    }
    expect([...kinds].sort()).toEqual(['difference', 'known-remainder', 'money', 'total']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is repeatable, varies indexed questions, and rejects invalid numeric inputs', () => {
    const keys = new Set<string>();
    const variants = new Set<string>();
    for (let index = 0; index < 16; index++) {
      const question = makeRagQuestion(451, index);
      expect(makeRagQuestion(451, index)).toEqual(question);
      keys.add(question.key);
      variants.add(solveVisible(visibleOnly(question)).kind);
    }
    expect(keys.size).toBe(16);
    expect(variants.size).toBe(4);
    expect(makeRagQuestion(451)).toEqual(makeRagQuestion(451, 0));
    expect(() => makeRagQuestion(NaN)).toThrow(RangeError);
    expect(() => makeRagQuestion(Infinity)).toThrow(RangeError);
    expect(() => makeRagQuestion(2, 0.5)).toThrow(RangeError);
  });

  it('declares the intended level, family and curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('equal-or-proportional-remainders');
    expect([...RAG_PATTERN.skillIds]).toEqual(['P5.S.FRAC.05', 'P4.S.FRAC.04', 'P3.S.FRAC.01']);
  });
});
