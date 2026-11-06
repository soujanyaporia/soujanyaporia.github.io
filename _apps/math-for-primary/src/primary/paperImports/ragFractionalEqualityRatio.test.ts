import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragFractionalEqualityRatio';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Variant = 'ratio' | 'difference-larger' | 'difference-total' | 'known-total';

function requiredMatch(text: string, expression: RegExp): RegExpExecArray {
  const match = expression.exec(text);
  if (!match) throw new Error(`Unrecognised visible given: ${text}`);
  return match;
}

function readGivens(question: VisibleQuestion) {
  const lines = question.context;
  if (!lines || lines.length < 2 || lines.length > 3) {
    throw new Error('Expected two or three visible context lines');
  }
  const introduction = requiredMatch(lines[0], /^([A-Za-z]+) and ([A-Za-z]+) each have some ([a-z]+)\.$/);
  const equality = requiredMatch(lines[1], /^Taking (\d+)\/(\d+) of ([A-Za-z]+)'s ([a-z]+) gives the same number as taking (\d+)\/(\d+) of ([A-Za-z]+)'s ([a-z]+)\.$/);
  const first = introduction[1];
  const second = introduction[2];
  const item = introduction[3];
  if (equality[3] !== first || equality[7] !== second || equality[4] !== item || equality[8] !== item) {
    throw new Error('Names or units disagree across visible givens');
  }
  return {
    first,
    second,
    item,
    a: Number(equality[1]),
    b: Number(equality[2]),
    c: Number(equality[5]),
    d: Number(equality[6]),
    extra: lines[2],
  };
}

// This solver receives only displayed prose. It does not receive answers,
// worked steps, seeds, keys, generator tables, or generation parameters.
function solveVisible(question: VisibleQuestion): {
  variant: Variant;
  answer: string;
  firstCount?: number;
  secondCount?: number;
} {
  const g = readGivens(question);
  const firstCoefficient = g.a * g.d;
  const secondCoefficient = g.c * g.b;
  if (firstCoefficient <= secondCoefficient) throw new Error('Expected the second collection to be larger');

  const ratioPrompt = `What is the ratio of the number of ${g.item} ${g.first} has to the number ${g.second} has? Give both terms in simplest form.`;
  if (question.prompt === ratioPrompt) {
    if (g.extra !== undefined) throw new Error('Unexpected extra given for a ratio question');
    // Enumerate integer pairs satisfying the visible fractional equality.
    // The first positive match is the primitive ratio; no generator gcd or
    // common-numerator construction is used.
    for (let first = 1; first <= secondCoefficient; first++) {
      for (let second = 1; second <= firstCoefficient; second++) {
        if (firstCoefficient * first === secondCoefficient * second) {
          return { variant: 'ratio', answer: JSON.stringify([String(first), String(second)]) };
        }
      }
    }
    throw new Error('No positive integer ratio satisfies the displayed fractions');
  }

  if (!g.extra) throw new Error('Missing quantity or difference');
  let firstCount: number;
  let secondCount: number;
  let fromDifference = false;
  const difference = /^([A-Za-z]+) has (\d+) more ([a-z]+) than ([A-Za-z]+)\.$/.exec(g.extra);
  if (difference) {
    if (difference[1] !== g.second || difference[3] !== g.item || difference[4] !== g.first) {
      throw new Error('Difference is attached to the wrong collection or unit');
    }
    const amount = Number(difference[2]);
    // Substitute second = first + amount into the displayed equality.
    firstCount = secondCoefficient * amount / (firstCoefficient - secondCoefficient);
    secondCount = firstCount + amount;
    fromDifference = true;
  } else {
    const known = requiredMatch(g.extra, /^([A-Za-z]+) has (\d+) ([a-z]+)\.$/);
    if (known[1] !== g.first || known[3] !== g.item) throw new Error('Known quantity is attached to the wrong collection');
    firstCount = Number(known[2]);
    secondCount = firstCoefficient * firstCount / secondCoefficient;
  }

  const totalPrompt = `How many ${g.item} do ${g.first} and ${g.second} have altogether?`;
  const largerPrompt = `How many ${g.item} does ${g.second} have?`;
  if (question.prompt === totalPrompt) {
    return {
      variant: fromDifference ? 'difference-total' : 'known-total',
      answer: String(firstCount + secondCount),
      firstCount,
      secondCount,
    };
  }
  if (question.prompt === largerPrompt && fromDifference) {
    return { variant: 'difference-larger', answer: String(secondCount), firstCount, secondCount };
  }
  throw new Error('Unrecognised visible response task');
}

const visible = (question: Question): VisibleQuestion => ({
  prompt: question.prompt,
  context: question.context,
});

const seeds = [
  -2147483648, -17, -1, 0, 1, 2147483647,
  ...Array.from({ length: 64 }, (_, i) => 17 * i + 9),
];

describe('fractional equality establishes a ratio', () => {
  it('independently solves all four visible response tasks across varied seeds and indices', () => {
    const variants = new Set<Variant>();
    const signatures = new Set<string>();
    const coefficientForms = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(question));
        const g = readGivens(visible(question));
        variants.add(solved.variant);
        signatures.add(JSON.stringify(visible(question)));
        coefficientForms.add(g.a === g.c ? 'same-numerator' : g.b === g.d ? 'same-denominator' : 'different-both');

        expect(question.answer).toBe(solved.answer);
        expect(g.a).toBeGreaterThan(0);
        expect(g.c).toBeGreaterThan(0);
        expect(g.a).toBeLessThan(g.b);
        expect(g.c).toBeLessThan(g.d);
        expect(g.b).toBeLessThanOrEqual(9);
        expect(g.d).toBeLessThanOrEqual(9);
        for (const [numerator, denominator] of [[g.a, g.b], [g.c, g.d]]) {
          for (let factor = 2; factor <= numerator; factor++) {
            expect(numerator % factor === 0 && denominator % factor === 0).toBe(false);
          }
        }
        expect(question.picture).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect((question.workedSteps ?? []).length).toBeGreaterThanOrEqual(3);

        if (solved.variant === 'ratio') {
          expect(question.structuredResponse).toEqual({
            kind: 'number-pair',
            firstLabel: `${g.first}'s parts`,
            secondLabel: `${g.second}'s parts`,
          });
          expect(question.choices).toBeUndefined();
          expect(question.unit).toBeUndefined();
        } else {
          const first = solved.firstCount!;
          const second = solved.secondCount!;
          expect(Number.isSafeInteger(first)).toBe(true);
          expect(Number.isSafeInteger(second)).toBe(true);
          expect(first).toBeGreaterThan(0);
          expect(second).toBeGreaterThan(first);
          expect(first + second).toBeLessThanOrEqual(1280);
          expect(g.a * first * g.d).toBe(g.c * second * g.b);
          expect(Number.isInteger(g.a * first / g.b)).toBe(true);
          expect(Number.isInteger(g.c * second / g.d)).toBe(true);
          expect(question.unit).toBe(g.item);
          expect(question.structuredResponse).toBeUndefined();

          if (solved.variant === 'known-total') {
            const choices = question.choices ?? [];
            expect(choices).toHaveLength(4);
            expect(new Set(choices).size).toBe(4);
            expect(choices.filter(choice => Number(choice) === first + second)).toHaveLength(1);
            for (const choice of choices) {
              expect(Number.isSafeInteger(Number(choice))).toBe(true);
              expect(Number(choice)).toBeGreaterThan(0);
            }
          } else {
            expect(question.choices).toBeUndefined();
          }
        }
      }
    }

    expect([...variants].sort()).toEqual(['difference-larger', 'difference-total', 'known-total', 'ratio']);
    expect([...coefficientForms].sort()).toEqual(['different-both', 'same-denominator', 'same-numerator']);
    expect(signatures.size).toBeGreaterThan(80);
  });

  it('uses only the visible amounts when independently recovering quantities', () => {
    let checkedDifference = false;
    let checkedKnown = false;
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(83, index);
      const original = solveVisible(visible(question));
      if (original.variant === 'ratio') continue;
      const changed = visible(question);
      changed.context = [...question.context!];

      if (original.variant.startsWith('difference-')) {
        changed.context[2] = changed.context[2].replace(/has (\d+) more/, (_, n: string) => `has ${2 * Number(n)} more`);
        const solved = solveVisible(changed);
        expect(Number(solved.answer)).toBe(2 * Number(original.answer));
        expect(solved.firstCount).toBe(2 * original.firstCount!);
        expect(solved.secondCount).toBe(2 * original.secondCount!);
        checkedDifference = true;
      } else {
        changed.context[2] = changed.context[2].replace(/has (\d+) /, (_, n: string) => `has ${3 * Number(n)} `);
        const solved = solveVisible(changed);
        expect(Number(solved.answer)).toBe(3 * Number(original.answer));
        expect(solved.secondCount).toBe(3 * original.secondCount!);
        checkedKnown = true;
      }
    }
    expect(checkedDifference).toBe(true);
    expect(checkedKnown).toBe(true);
  });

  it('is reproducible and presents every variant in four consecutive indices', () => {
    for (const seed of [-101, 0, 57, 2026]) {
      const variants = new Set<Variant>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        variants.add(solveVisible(visible(first)).variant);
        keys.add(first.key);
      }
      expect(variants.size).toBe(4);
      expect(keys.size).toBe(4);
    }
    expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-fractional-equality-establishes-ratio');
  });
});
