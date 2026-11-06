import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragAllocationsOfOneWhole';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type VisibleSolution = {
  kind: 'area' | 'money' | 'fraction';
  expected: string;
  percentages: [number, number];
  whole?: number;
  allocations?: [number, number];
  remainder?: number;
};

// This solver receives only text shown to the child, never answers, hints,
// worked steps, random state or generation parameters.
function solveVisible(q: VisibleQuestion): VisibleSolution {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  const percentages = Array.from(text.matchAll(/(\d+)%/g), match => Number(match[1]));
  if (percentages.length !== 2) throw new Error('Expected two visible percentages');
  const [first, second] = percentages;
  if (!(first > 0 && second > 0 && first + second < 100)) {
    throw new Error('Allocations must leave a positive remainder');
  }
  const pair: [number, number] = [first, second];

  const areaMatch = /A school mural covers (\d+) m²\./.exec(text);
  if (areaMatch) {
    if (!text.includes('The two designs cover separate parts.')) {
      throw new Error('The area allocations must be disjoint');
    }
    const whole = Number(areaMatch[1]);
    // Calculate each allocated area separately, then subtract actual areas.
    const allocations: [number, number] = [whole * first / 100, whole * second / 100];
    const remainder = whole - allocations[0] - allocations[1];
    return {kind: 'area', expected: String(remainder), percentages: pair, whole, allocations, remainder};
  }

  const budgetMatch = /has \$(\d+)\.(\d{2}) for a fun day\./.exec(text);
  if (budgetMatch) {
    if (!text.includes('of the same starting amount')) {
      throw new Error('Both expenses must use the original budget');
    }
    const whole = Number(budgetMatch[1]) * 100 + Number(budgetMatch[2]);
    // Solve in cents by finding both expenses, rather than using a percent gap.
    const allocations: [number, number] = [whole * first / 100, whole * second / 100];
    const remainder = whole - allocations[0] - allocations[1];
    const difference = Math.abs(allocations[0] - remainder);
    const expected = JSON.stringify([
      (remainder / 100).toFixed(2),
      (difference / 100).toFixed(2),
    ]);
    return {kind: 'money', expected, percentages: pair, whole, allocations, remainder};
  }

  if (!text.includes('What fraction of her starting money') ||
      !text.includes('simplest form')) {
    throw new Error('Unrecognised visible question');
  }
  // Find the smallest possible denominator by enumeration. This does not
  // reuse the generator's greatest-common-factor implementation.
  const spent = first + second;
  for (let denominator = 1; denominator <= 100; denominator++) {
    if (spent * denominator % 100 === 0) {
      return {
        kind: 'fraction',
        expected: `${spent * denominator / 100}/${denominator}`,
        percentages: pair,
      };
    }
  }
  throw new Error('No exact fraction found');
}

function visible(q: Question): VisibleQuestion {
  return {context: q.context, prompt: q.prompt};
}

describe('allocations of one original whole', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const examples = new Map<string, Set<string>>();
    let moneyWithCents = 0;

    for (let seed = -40; seed <= 80; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        if (!examples.has(solved.kind)) examples.set(solved.kind, new Set());
        examples.get(solved.kind)!.add(JSON.stringify(q.context));

        expect(q.answer).toBe(solved.expected);
        expect(correctAnswer(q, solved.expected)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps!.every(step => step.picture === undefined)).toBe(true);

        if (solved.kind === 'area') {
          expect(q.unit).toBe('m²');
          expect(q.structuredResponse).toBeUndefined();
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => correctAnswer(q, choice))).toHaveLength(1);
          expect(q.choices).toContain(solved.expected);
          expect(solved.remainder).toBeGreaterThan(0);
          expect(solved.remainder).toBeLessThan(solved.whole!);
          for (const value of [...solved.allocations!, solved.remainder!]) {
            expect(Number.isInteger(value)).toBe(true);
          }
          for (const choice of q.choices!) {
            expect(Number(choice)).toBeGreaterThan(0);
            expect(Number(choice)).toBeLessThan(solved.whole!);
          }
        } else if (solved.kind === 'money') {
          expect(q.unit).toBe('dollars');
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse).toEqual({
            kind: 'number-pair',
            firstLabel: '(a) Prize money ($)',
            secondLabel: '(b) Difference ($)',
            decimal: true,
          });
          expect(q.prompt).toContain('(a)');
          expect(q.prompt).toContain('(b)');
          expect(solved.allocations![0]).toBeGreaterThan(solved.remainder!);
          expect(solved.remainder).toBeGreaterThan(0);
          expect(solved.allocations![0] + solved.allocations![1] + solved.remainder!).toBe(solved.whole);
          for (const value of [...solved.allocations!, solved.remainder!]) {
            expect(Number.isSafeInteger(value)).toBe(true);
          }
          const expectedParts = JSON.parse(solved.expected) as string[];
          expect(expectedParts.every(part => /^\d+\.\d{2}$/.test(part))).toBe(true);
          if (expectedParts.some(part => !part.endsWith('.00'))) moneyWithCents++;
        } else {
          expect(q.requireSimplified).toBe(true);
          expect(q.unit).toBeUndefined();
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse).toBeUndefined();
          const [numerator, denominator] = solved.expected.split('/').map(Number);
          expect(numerator).toBeGreaterThan(0);
          expect(numerator).toBeLessThan(denominator);
          expect(numerator * 100).toBe((solved.percentages[0] + solved.percentages[1]) * denominator);
          for (let divisor = 2; divisor <= numerator; divisor++) {
            expect(numerator % divisor === 0 && denominator % divisor === 0).toBe(false);
          }
        }
      }
    }

    expect([...kinds].sort()).toEqual(['area', 'fraction', 'money']);
    expect(examples.get('area')!.size).toBeGreaterThan(10);
    expect(examples.get('money')!.size).toBeGreaterThan(10);
    expect(examples.get('fraction')!.size).toBeGreaterThanOrEqual(4);
    expect(moneyWithCents).toBeGreaterThan(0);
  });

  it('preserves response rules and rejects plausible incorrect answers', () => {
    const area = makeRagQuestion(0, 0);
    const areaSolution = solveVisible(visible(area));
    expect(areaSolution.kind).toBe('area');
    const allocationArea = String(areaSolution.allocations![0]);
    expect(correctAnswer(area, allocationArea)).toBe(false);

    const money = makeRagQuestion(0, 1);
    const moneySolution = solveVisible(visible(money));
    expect(moneySolution.kind).toBe('money');
    const amounts = JSON.parse(moneySolution.expected) as string[];
    expect(correctAnswer(money, JSON.stringify(amounts.map(value => String(Number(value)))))).toBe(true);
    expect(correctAnswer(money, JSON.stringify([amounts[1], amounts[0]]))).toBe(false);
    expect(correctAnswer(money, JSON.stringify([amounts[0]]))).toBe(false);
    expect(correctAnswer(money, JSON.stringify([
      amounts[0], (Number(amounts[1]) + 0.01).toFixed(2),
    ]))).toBe(false);

    const fraction = makeRagQuestion(0, 2);
    const fractionSolution = solveVisible(visible(fraction));
    expect(fractionSolution.kind).toBe('fraction');
    const [numerator, denominator] = fractionSolution.expected.split('/').map(Number);
    expect(correctAnswer(fraction, `${numerator * 2}/${denominator * 2}`)).toBe(false);
    expect(correctAnswer(fraction, String(numerator / denominator))).toBe(false);
    expect(correctAnswer(fraction, `${denominator - numerator}/${denominator}`)).toBe(false);
  });

  it('is deterministic and retains the declared family and level', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('allocations-of-one-original-whole');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03']);
    const keys = new Set<string>();
    for (const seed of [-2147483648, -17, 0, 23, 2147483647]) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        expect(q.answer).toBe(solveVisible(visible(q)).expected);
      }
    }
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  });
});
