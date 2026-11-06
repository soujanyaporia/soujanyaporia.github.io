import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragCommonQuantityCostDifferences';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Variant = 'equal-expenditure' | 'bundle-one' | 'bundle-total';
type Solution = {
  variant: Variant;
  count: number;
  answer: number;
  unit: string;
  fractionalCentRate: boolean;
};

function readMatch(text: string, pattern: RegExp): RegExpMatchArray {
  const result = text.match(pattern);
  if (!result) throw new Error(`Required visible given is missing for ${pattern}`);
  return result;
}

function cents(amount: string): number {
  const match = readMatch(amount, /^(\d+)\.(\d{2})$/);
  return Number(match[1]) * 100 + Number(match[2]);
}

function positiveWholeQuotient(numerator: number, denominator: number): number {
  if (numerator <= 0 || denominator <= 0 || numerator % denominator !== 0) {
    throw new Error('Visible prices and costs must determine a positive whole count.');
  }
  const result = numerator / denominator;
  if (!Number.isSafeInteger(result)) throw new Error('Count exceeds exact integer arithmetic.');
  return result;
}

// This solver receives only the question text. It uses exact rate equations
// independently of the generator's batch construction and price multipliers.
function solveVisible(question: VisibleQuestion): Solution {
  const visible = (question.context ?? []).join('\n');

  if (visible.includes('Erasers are sold in packs')) {
    const name = readMatch(
      visible,
      /^([A-Za-z]+) needs an equal number of erasers and pencils for a class activity\.$/m,
    )[1];
    readMatch(visible, /buys only full packs\./);
    const erasers = readMatch(
      visible,
      /^Erasers are sold in packs of (\d+) for \$(\d+\.\d{2}) per pack\.$/m,
    );
    const pencils = readMatch(
      visible,
      /^Pencils are sold in packs of (\d+) for \$(\d+\.\d{2}) per pack\.$/m,
    );
    const difference = readMatch(
      visible,
      /The pencils cost \$(\d+\.\d{2}) more altogether than the erasers\./,
    );
    const eraserPackSize = Number(erasers[1]);
    const pencilPackSize = Number(pencils[1]);
    const eraserPackCents = cents(erasers[2]);
    const pencilPackCents = cents(pencils[2]);
    const differenceCents = cents(difference[1]);
    if (eraserPackSize <= 0 || pencilPackSize <= 0 || eraserPackCents <= 0 || pencilPackCents <= 0) {
      throw new Error('Pack sizes and prices must be positive.');
    }

    // n * (pencil price / pencil pack size - eraser price / eraser pack size)
    // equals the visible expenditure difference. Cross multiplication keeps
    // fractional-cent rates exact.
    const numerator = differenceCents * pencilPackSize * eraserPackSize;
    const denominator = pencilPackCents * eraserPackSize - eraserPackCents * pencilPackSize;
    const count = positiveWholeQuotient(numerator, denominator);
    if (count % eraserPackSize !== 0 || count % pencilPackSize !== 0) {
      throw new Error('The count must allow complete packs of both items.');
    }
    const actualDifference = count / pencilPackSize * pencilPackCents -
      count / eraserPackSize * eraserPackCents;
    if (actualDifference !== differenceCents) throw new Error('Purchase totals disagree with the visible difference.');

    const combined = question.prompt === `How many erasers and pencils does ${name} buy altogether?`;
    if (!combined && question.prompt !== `How many pencils does ${name} buy?`) {
      throw new Error('The requested count must be explicit.');
    }
    return {
      variant: combined ? 'bundle-total' : 'bundle-one',
      count,
      answer: combined ? 2 * count : count,
      unit: combined ? 'items' : 'pencils',
      fractionalCentRate: eraserPackCents % eraserPackSize !== 0 || pencilPackCents % pencilPackSize !== 0,
    };
  }

  const asha = readMatch(
    visible,
    /^At one shop, Asha buys some pens at \$(\d+\.\d{2}) each and (\d+) notebooks at \$(\d+\.\d{2}) each\.$/m,
  );
  const ben = readMatch(
    visible,
    /^At another shop, Ben buys the same number of pens at \$(\d+\.\d{2}) each and (\d+) notebooks at \$(\d+\.\d{2}) each\.$/m,
  );
  readMatch(visible, /^They spend the same amount in total\.$/m);
  if (question.prompt !== 'How many pens does Asha buy?') throw new Error('The requested purchase must be explicit.');
  const ashaPenCents = cents(asha[1]);
  const benPenCents = cents(ben[1]);
  const ashaNotebookCount = Number(asha[2]);
  const benNotebookCount = Number(ben[2]);
  const ashaNotebookCents = cents(asha[3]);
  const benNotebookCents = cents(ben[3]);
  if (ashaNotebookCount <= 0 || ashaNotebookCount !== benNotebookCount) {
    throw new Error('The known notebook counts must be positive and equal.');
  }
  const knownPurchaseDifference = benNotebookCount * benNotebookCents -
    ashaNotebookCount * ashaNotebookCents;
  const count = positiveWholeQuotient(knownPurchaseDifference, ashaPenCents - benPenCents);
  const ashaTotal = count * ashaPenCents + ashaNotebookCount * ashaNotebookCents;
  const benTotal = count * benPenCents + benNotebookCount * benNotebookCents;
  if (ashaTotal !== benTotal) throw new Error('The reconstructed expenditures must be equal.');
  return {variant: 'equal-expenditure', count, answer: count, unit: 'pens', fractionalCentRate: false};
}

const bundleExample: VisibleQuestion = {
  context: [
    'Nadia needs an equal number of erasers and pencils for a class activity.',
    'Erasers are sold in packs of 3 for $1.25 per pack.',
    'Pencils are sold in packs of 4 for $2.15 per pack.',
    'Nadia buys only full packs. The pencils cost $10.15 more altogether than the erasers.',
  ],
  prompt: 'How many pencils does Nadia buy?',
};

const equalExpenditureExample: VisibleQuestion = {
  context: [
    'At one shop, Asha buys some pens at $0.95 each and 9 notebooks at $1.65 each.',
    'At another shop, Ben buys the same number of pens at $0.65 each and 9 notebooks at $2.55 each.',
    'They spend the same amount in total.',
  ],
  prompt: 'How many pens does Asha buy?',
};

describe('common quantity from cost differences', () => {
  test('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [
      ...Array.from({length: 48}, (_, i) => i),
      -1, -123456, 2147483647, 4294967295, Number.MAX_SAFE_INTEGER,
    ];
    const variants = new Set<Variant>();
    const visibleQuestions = new Set<string>();
    let fractionalCentCases = 0;

    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const question = makeRagQuestion(seed, index);
        const visible = {context: question.context, prompt: question.prompt};
        const solution = solveVisible(visible);
        expect(question.answer).toBe(String(solution.answer));
        expect(question.unit).toBe(solution.unit);
        expect(solution.count).toBeGreaterThan(0);
        expect(solution.count).toBeLessThanOrEqual(180);
        expect(solution.answer).toBeLessThanOrEqual(360);
        expect(question.answer).toMatch(/^[1-9]\d*$/);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(6);
        expect(question.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(question.explanation).toBe(
          question.workedSteps!.map(step => `${step.text} ${step.equation}`).join(' '),
        );
        expect(question.picture).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(question.choices).toBeUndefined();
        variants.add(solution.variant);
        visibleQuestions.add(JSON.stringify(visible));
        if (solution.fractionalCentRate) fractionalCentCases++;
      }
    }

    expect([...variants].sort()).toEqual(['bundle-one', 'bundle-total', 'equal-expenditure']);
    expect(fractionalCentCases).toBeGreaterThan(0);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  test('repeats deterministically and cycles through all three response tasks', () => {
    for (const seed of [-7, 0, 1, 98765]) {
      const variants = new Set<Variant>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        expect(question.key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
        variants.add(solveVisible({context: question.context, prompt: question.prompt}).variant);
        keys.add(question.key);
      }
      expect(variants.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  test('handles fractional-cent bundle rates and the requested count multiplier exactly', () => {
    // Twelve of each item cost 500 cents and 645 cents. Seven such batches
    // give a 1015-cent difference and 84 items of each kind.
    const oneKind = solveVisible(bundleExample);
    expect(oneKind.count).toBe(84);
    expect(oneKind.answer).toBe(84);
    expect(oneKind.fractionalCentRate).toBe(true);

    const bothKinds = solveVisible({
      ...bundleExample,
      prompt: 'How many erasers and pencils does Nadia buy altogether?',
    });
    expect(bothKinds.answer).toBe(168);
    expect(bothKinds.unit).toBe('items');

    const changedDifference = solveVisible({
      ...bundleExample,
      context: bundleExample.context!.map(line => line.replace('$10.15', '$11.60')),
    });
    expect(changedDifference.count).toBe(96);
  });

  test('uses the known purchase to balance equal expenditures', () => {
    // Nine notebooks produce an 810-cent difference. A 30-cent pen-price
    // difference balances it with 27 pens for each shopper.
    expect(solveVisible(equalExpenditureExample).answer).toBe(27);
    const changedKnownCount = solveVisible({
      ...equalExpenditureExample,
      context: equalExpenditureExample.context!.map(line => line.replace('9 notebooks', '11 notebooks')),
    });
    expect(changedKnownCount.answer).toBe(33);
  });

  test('declares one Primary 5 family using supplied curriculum skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-common-quantity-from-cost-differences');
    const allowedSkills = new Set(['P5.S.RATE.01', 'P5.S.RATE.02', 'P4.S.DEC.05']);
    expect(RAG_PATTERN.skillIds.every(id => allowedSkills.has(id))).toBe(true);
  });
});
