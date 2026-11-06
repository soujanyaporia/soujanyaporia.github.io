import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPercentageRepresentations';

type Kind = 'decimal-percent' | 'percent-fraction' | 'percent-decimal' | 'fraction-percent';
type Rational = {n: number; d: number};
type Solution = {kind: Kind; answer: string; thirdDigit?: number};

function readDecimal(text: string): Rational {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error(`Not a visible decimal: ${text}`);
  const digits = match[2] ?? '';
  return {n: Number(match[1] + digits), d: 10 ** digits.length};
}

function readPercent(text: string): Rational {
  if (!text.endsWith('%')) throw new Error(`Missing percent sign: ${text}`);
  return readDecimal(text.slice(0, -1));
}

function readFraction(text: string): Rational {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match || Number(match[2]) === 0) throw new Error(`Not a visible fraction: ${text}`);
  return {n: Number(match[1]), d: Number(match[2])};
}

// This solver receives only information visible before the pupil answers.
// It does not receive the generated answer, seed, index, hints or worked steps.
function solveVisible(q: Pick<Question, 'prompt' | 'display'>): Solution {
  if (!q.display) throw new Error('Missing visible number');

  if (q.prompt.includes('simplest form')) {
    const percentage = readPercent(q.display);
    const numerator = percentage.n;
    const denominator = percentage.d * 100;
    // Find the smallest possible denominator by exact divisibility,
    // independently of the generator's greatest-common-factor calculation.
    for (let candidate = 1; candidate <= denominator; candidate++) {
      if ((numerator * candidate) % denominator === 0) {
        return {
          kind: 'percent-fraction',
          answer: `${numerator * candidate / denominator}/${candidate}`,
        };
      }
    }
    throw new Error('No equivalent fraction found');
  }

  if (q.prompt.includes('as a decimal')) {
    const percentage = readPercent(q.display);
    return {kind: 'percent-decimal', answer: String(percentage.n / (percentage.d * 100))};
  }

  if (q.prompt.includes('2 decimal places')) {
    const fraction = readFraction(q.display);
    const whole = Math.floor(fraction.n * 100 / fraction.d);
    let remainder = fraction.n * 100 % fraction.d;
    const digits: number[] = [];
    // Long division produces the two retained digits and the rounding digit.
    for (let place = 0; place < 3; place++) {
      remainder *= 10;
      digits.push(Math.floor(remainder / fraction.d));
      remainder %= fraction.d;
    }
    const cents = whole * 100 + digits[0] * 10 + digits[1] + (digits[2] >= 5 ? 1 : 0);
    return {
      kind: 'fraction-percent',
      answer: `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`,
      thirdDigit: digits[2],
    };
  }

  if (q.prompt.includes('same value as the decimal')) {
    const value = readDecimal(q.display);
    return {kind: 'decimal-percent', answer: `${value.n * 100 / value.d}%`};
  }
  throw new Error(`Unknown visible task: ${q.prompt}`);
}

const seeds = [-2147483648, -91, -1, 0, 1, 2147483647,
  ...Array.from({length: 160}, (_, i) => i * 137 + 23)];

describe('percentage representations candidate', () => {
  it('independently solves visible givens across varied seeds and checks response constraints', () => {
    const counts: Record<Kind, number> = {
      'decimal-percent': 0,
      'percent-fraction': 0,
      'percent-decimal': 0,
      'fraction-percent': 0,
    };
    let smallFractionPercentage = false;
    let smallDecimalPercentage = false;
    let percentageAbove100 = false;
    let decimalAboveOne = false;
    let roundedUp = false;
    let roundedDown = false;

    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({prompt: q.prompt, display: q.display});
        counts[solution.kind]++;
        expect(q.answer).toBe(solution.answer);
        expect(correctAnswer(q, solution.answer)).toBe(true);
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps!.every(step => step.text.trim().length > 0)).toBe(true);
        expect(q.explanation).toBe(q.workedSteps!.map(step => step.text).join(' '));
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBe(solution.kind === 'fraction-percent' ? '%' : undefined);
        expect(['2.5', '0.1%', '2/3']).not.toContain(q.display);

        if (solution.kind === 'decimal-percent') {
          const value = readDecimal(q.display!);
          expect(value.n / value.d).toBeGreaterThan(0);
          expect(value.n / value.d).toBeLessThan(5);
          expect(value.n % value.d).not.toBe(0);
          decimalAboveOne ||= value.n > value.d;
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          // Compare each visible option mathematically, not just by its text.
          const matchingChoices = q.choices!.filter(option => {
            const percentage = readPercent(option);
            return percentage.n * value.d === value.n * 100 * percentage.d;
          });
          expect(matchingChoices).toEqual([solution.answer]);
          for (const option of q.choices!) {
            expect(correctAnswer(q, option)).toBe(option === solution.answer);
          }
        } else {
          expect(q.choices).toBeUndefined();
        }

        if (solution.kind === 'percent-fraction') {
          const given = readPercent(q.display!);
          expect(given.n / given.d).toBeGreaterThan(0);
          expect(given.n / given.d).toBeLessThan(100);
          smallFractionPercentage ||= given.n < given.d;
          expect(q.requireSimplified).toBe(true);
          const fraction = readFraction(solution.answer);
          expect(fraction.n).toBeLessThan(fraction.d);
          expect(correctAnswer(q, `${fraction.n * 2}/${fraction.d * 2}`)).toBe(false);
          expect(correctAnswer(q, `${fraction.n + 1}/${fraction.d}`)).toBe(false);
        }

        if (solution.kind === 'percent-decimal') {
          const given = readPercent(q.display!);
          expect(given.n / given.d).toBeGreaterThan(0);
          expect(given.n / given.d).toBeLessThan(250);
          smallDecimalPercentage ||= given.n < given.d;
          percentageAbove100 ||= given.n > 100 * given.d;
          expect(q.answer).toMatch(/^\d+(?:\.\d{1,3})?$/);
          // Leaving the percentage value unchanged is the wrong conversion.
          expect(correctAnswer(q, q.display!.slice(0, -1))).toBe(false);
        }

        if (solution.kind === 'fraction-percent') {
          const given = readFraction(q.display!);
          expect(given.n).toBeGreaterThan(0);
          expect(given.n).toBeLessThan(given.d);
          expect(given.d).toBeLessThanOrEqual(12);
          expect(given.n * 10000 % given.d).not.toBe(0);
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          roundedUp ||= solution.thirdDigit! >= 5;
          roundedDown ||= solution.thirdDigit! < 5;
          expect(correctAnswer(q, String(given.n * 100 / given.d))).toBe(false);
        }
      }
    }
    expect(Object.values(counts).every(count => count > 0)).toBe(true);
    expect(smallFractionPercentage).toBe(true);
    expect(smallDecimalPercentage).toBe(true);
    expect(percentageAbove100).toBe(true);
    expect(decimalAboveOne).toBe(true);
    expect(roundedUp).toBe(true);
    expect(roundedDown).toBe(true);
  });

  it('reproduces each question, varies visible numbers and visits all variants in four indices', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-percentage-representations');
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const variants = new Set<Kind>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        variants.add(solveVisible({prompt: q.prompt, display: q.display}).kind);
        visibleQuestions.add(`${q.prompt}|${q.display}`);
      }
      expect(variants.size).toBe(4);
    }
    expect(visibleQuestions.size).toBeGreaterThan(120);
  });
});
