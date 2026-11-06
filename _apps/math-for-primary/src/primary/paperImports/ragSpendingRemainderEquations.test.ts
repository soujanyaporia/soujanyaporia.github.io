import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { CURRICULUM_SKILLS } from '../../school/curriculum';
import {
  structuredResponseCorrect,
  structuredResponseReady,
} from './batch6MiddleResponse';
import { makeRagQuestion, RAG_PATTERN } from './ragSpendingRemainderEquations';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'price' | 'spending' | 'fraction';
  answer: string;
  moneyCents: number[];
  count?: number;
};

function capture(text: string, expression: RegExp): string[] {
  const match = expression.exec(text);
  if (!match) {
    throw new Error(`Missing visible givens for ${expression}`);
  }
  return match.slice(1);
}

function toCents(text: string): number {
  const [dollars, cents = '00'] = text.split('.');
  return Number(dollars) * 100 + Number(cents.padEnd(2, '0'));
}

function moneyText(cents: number): string {
  return (cents / 100).toFixed(2);
}

// This solver receives only the prompt and the displayed context.
// It cannot access the stored answer, worked solution or generation parameters.
function solveVisible(question: VisibleQuestion): Solution {
  const text = (question.context ?? []).join(' ');

  if (question.prompt.includes('price of one pencil case')) {
    const [differenceText] = capture(text, /Asha started with \$(\d+\.\d{2}) more than Ben\./);
    const counts = capture(
      text,
      /Asha bought (\d+) pencil cases and (\d+) pens\. Ben bought (\d+) pencil cases and (\d+) pens\./,
    ).map(Number);
    const [ashaCases, ashaPens, benCases, benPens] = counts;
    const [priceMultipleText] = capture(text, /Each pencil case cost (\d+) times as much as a pen\./);
    const [ashaInitialText, balanceMultipleText] = capture(
      text,
      /Asha started with \$(\d+\.\d{2})\. Ben's starting amount was (\d+) times/,
    );
    const difference = toCents(differenceText);
    const ashaInitial = toCents(ashaInitialText);
    const priceMultiple = Number(priceMultipleText);
    const balanceMultiple = Number(balanceMultipleText);
    const benInitial = ashaInitial - difference;
    const benLeft = benInitial / balanceMultiple;
    const benSpent = benInitial - benLeft;
    const benPriceUnits = benCases * priceMultiple + benPens;
    const ashaPriceUnits = ashaCases * priceMultiple + ashaPens;
    const penPrice = benSpent / benPriceUnits;
    const casePrice = priceMultiple * penPrice;
    const ashaSpent = ashaCases * casePrice + ashaPens * penPrice;
    const ashaLeft = ashaInitial - ashaSpent;
    const endDifference = Math.abs(ashaLeft - benLeft);
    const direction = endDifference > difference
      ? 'Increase'
      : endDifference < difference ? 'Decrease' : 'Stay the same';

    expect(ashaPriceUnits).toBe(benPriceUnits);
    expect(ashaSpent).toBe(benSpent);
    expect(benLeft * balanceMultiple).toBe(benInitial);
    expect(benCases * casePrice + benPens * penPrice).toBe(benSpent);
    expect(ashaLeft - benLeft).toBe(difference);

    return {
      kind: 'price',
      answer: `(a) ${direction}. (b) $${moneyText(casePrice)}`,
      moneyCents: [difference, ashaInitial, benInitial, ashaSpent, benSpent, ashaLeft, benLeft, penPrice, casePrice],
    };
  }

  if (question.prompt.includes('How much did Omar spend')) {
    const [totalText] = capture(text, /Omar and Lena had \$(\d+\.\d{2}) altogether/);
    const [spendingMultipleText] = capture(text, /Omar spent (\d+) times as much money as Lena\./);
    const [gapText] = capture(text, /Lena's money left was \$(\d+\.\d{2}) more than the amount she spent\./);
    const [remainderMultipleText] = capture(text, /Lena had (\d+) times as much money left as Omar\./);
    const total = toCents(totalText);
    const gap = toCents(gapText);
    const spendingMultiple = Number(spendingMultipleText);
    const remainderMultiple = Number(remainderMultipleText);

    // Solve directly for Lena's spending from the visible total balance.
    // This uses a different unknown from the generator's worked unit method.
    const numerator = remainderMultiple * total - (remainderMultiple + 1) * gap;
    const denominator = remainderMultiple * (spendingMultiple + 1) + remainderMultiple + 1;
    const lenaSpent = numerator / denominator;
    const omarSpent = spendingMultiple * lenaSpent;
    const lenaLeft = lenaSpent + gap;
    const omarLeft = lenaLeft / remainderMultiple;
    const lenaInitial = lenaSpent + lenaLeft;
    const omarInitial = omarSpent + omarLeft;

    expect(lenaInitial + omarInitial).toBe(total);
    expect(lenaLeft - lenaSpent).toBe(gap);
    expect(omarSpent).toBe(spendingMultiple * lenaSpent);
    expect(lenaLeft).toBe(remainderMultiple * omarLeft);

    return {
      kind: 'spending',
      answer: JSON.stringify([moneyText(omarSpent), moneyText(lenaInitial)]),
      moneyCents: [total, gap, lenaSpent, omarSpent, lenaLeft, omarLeft, lenaInitial, omarInitial],
    };
  }

  if (question.prompt.includes('How many notebooks did she buy')) {
    const [fixedText] = capture(text, /she first set aside \$(\d+\.\d{2})\./);
    const [bookNumerator, bookDenominator] = capture(
      text,
      /She added (\d+)\/(\d+) of the money still in her purse/,
    ).map(Number);
    const [lunchNumerator, lunchDenominator] = capture(
      text,
      /After buying the notebooks, she spent (\d+)\/(\d+) of the money left in her purse on lunch\./,
    ).map(Number);
    const [finalNumerator, finalDenominator] = capture(
      text,
      /At the end, she had (\d+)\/(\d+) of her starting money left\./,
    ).map(Number);
    const [priceText] = capture(text, /One notebook cost \$(\d+\.\d{2})\./);
    const fixed = toCents(fixedText);
    const price = toCents(priceText);
    const retainedNumerator = (bookDenominator - bookNumerator) * (lunchDenominator - lunchNumerator);
    const retainedDenominator = bookDenominator * lunchDenominator;
    const balanceDenominator = retainedNumerator * finalDenominator - finalNumerator * retainedDenominator;

    expect(bookNumerator).toBeGreaterThan(0);
    expect(bookNumerator).toBeLessThan(bookDenominator);
    expect(lunchNumerator).toBeGreaterThan(0);
    expect(lunchNumerator).toBeLessThan(lunchDenominator);
    expect(finalNumerator).toBeGreaterThan(0);
    expect(finalNumerator).toBeLessThan(finalDenominator);
    expect(balanceDenominator).toBeGreaterThan(0);

    // Solve the two visible expressions for the final balance directly.
    const initial = fixed * retainedNumerator * finalDenominator / balanceDenominator;
    const afterSetAside = initial - fixed;
    const topUp = afterSetAside * bookNumerator / bookDenominator;
    const bill = fixed + topUp;
    const beforeLunch = initial - bill;
    const lunch = beforeLunch * lunchNumerator / lunchDenominator;
    const final = beforeLunch - lunch;
    const count = bill / price;

    expect(final * finalDenominator).toBe(initial * finalNumerator);
    expect(bill + lunch + final).toBe(initial);
    expect(count * price).toBe(bill);
    expect(Number.isInteger(topUp)).toBe(true);

    return {
      kind: 'fraction',
      answer: JSON.stringify([moneyText(final), String(count)]),
      moneyCents: [initial, fixed, afterSetAside, topUp, bill, beforeLunch, lunch, final, price],
      count,
    };
  }

  throw new Error('Unrecognised visible question form');
}

describe('spending and remainder equations candidate', () => {
  it('solves visible givens independently across seeds and preserves both linked answers', () => {
    const seeds = [-101, -7, -1, ...Array.from({ length: 120 }, (_, seed) => seed), 2026, 4294967295];
    const seenKinds = new Set<string>();
    const distinctContexts: Record<Solution['kind'], Set<string>> = {
      price: new Set(),
      spending: new Set(),
      fraction: new Set(),
    };

    for (const seed of seeds) {
      for (const index of [-1, 0, 1, 2, 7]) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({ prompt: question.prompt, context: question.context });
        seenKinds.add(solved.kind);
        distinctContexts[solved.kind].add(JSON.stringify(question.context));
        expect(question.answer).toBe(solved.answer);
        expect(question.prompt).toContain('(a)');
        expect(question.prompt).toContain('(b)');
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(7);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(100);
        expect(question.picture).toBeUndefined();

        for (const amount of solved.moneyCents) {
          expect(Number.isSafeInteger(amount)).toBe(true);
          expect(amount).toBeGreaterThan(0);
          expect(amount).toBeLessThanOrEqual(100000);
        }
        if (solved.count !== undefined) {
          expect(Number.isSafeInteger(solved.count)).toBe(true);
          expect(solved.count).toBeGreaterThanOrEqual(3);
          expect(solved.count).toBeLessThanOrEqual(48);
        }

        if (question.structuredResponse) {
          const spec = question.structuredResponse;
          expect(structuredResponseReady(spec, solved.answer)).toBe(true);
          expect(structuredResponseCorrect(spec, question.answer, solved.answer)).toBe(true);
          const fields = JSON.parse(solved.answer) as string[];
          expect(fields).toHaveLength(2);
          for (let part = 0; part < fields.length; part += 1) {
            const wrong = [...fields];
            wrong[part] = String(Number(wrong[part]) + 1);
            expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(wrong))).toBe(false);
          }
          expect(structuredResponseReady(spec, JSON.stringify([fields[0]]))).toBe(false);
          if (solved.kind === 'fraction') {
            expect(spec.kind).toBe('number-fields');
            expect(structuredResponseReady(spec, JSON.stringify([fields[0], '2.5']))).toBe(false);
          }
        } else {
          expect(solved.kind).toBe('price');
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices?.filter(choice => choice === solved.answer)).toHaveLength(1);
          expect(question.choices?.every(choice => /^\(a\) (Stay the same|Increase|Decrease)\. \(b\) \$\d+\.\d{2}$/.test(choice))).toBe(true);
        }
      }
    }

    expect([...seenKinds].sort()).toEqual(['fraction', 'price', 'spending']);
    for (const contexts of Object.values(distinctContexts)) {
      expect(contexts.size).toBeGreaterThan(20);
    }
  });

  it('produces reproducible questions and covers all forms in three successive indices', () => {
    for (const seed of [-12, -1, 0, 1, 42, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      makeRagQuestion(seed + 99, 8);
      questions.forEach((question, index) => {
        expect(makeRagQuestion(seed, index)).toEqual(question);
      });
      expect(new Set(questions.map(question => solveVisible(question).kind)).size).toBe(3);
      expect(new Set(questions.map(question => question.key)).size).toBe(3);
    }
  });

  it('declares the P5 family and uses skills present in the supplied curriculum', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-spending-and-remainder-equations');
    const curriculumIds = new Set(CURRICULUM_SKILLS.map(skill => skill.id));
    for (const skillId of RAG_PATTERN.skillIds) {
      expect(curriculumIds.has(skillId)).toBe(true);
    }
  });
});
