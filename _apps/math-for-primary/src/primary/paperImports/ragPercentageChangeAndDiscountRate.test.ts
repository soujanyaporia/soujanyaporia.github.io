import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragPercentageChangeAndDiscountRate';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution =
  | {kind: 'payment'; answers: number[]; paid: number; discount: number; usual: number}
  | {kind: 'remaining'; answers: number[]; initial: number; remaining: number; final: number; used: number; hearts: number; heartsRemaining: number}
  | {kind: 'prices'; answers: number[]; total: number; difference: number; tabletSale: number; laptopSale: number; tabletUsual: number; laptopUsual: number};

function capture(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1);
}

function readCents(text: string): number {
  const [dollars, cents] = text.split('.');
  return Number(dollars) * 100 + Number(cents);
}

// This solver receives only what the pupil can read. It cannot access answers,
// worked steps, keys, random choices or generation parameters.
function solveVisible(question: Visible): Solution {
  const text = (question.context ?? []).join(' ');
  if (text.includes('lunch bag')) {
    const [discountText, paidText] = capture(text,
      /reduced by [$]([0-9]+[.][0-9]{2})[.] Hana paid [$]([0-9]+[.][0-9]{2})/);
    const discount = readCents(discountText);
    const paid = readCents(paidText);
    const usual = paid + discount;
    return {kind: 'payment', answers: [100 * discount / usual], paid, discount, usual};
  }
  if (text.includes('paper stars')) {
    const initial = Number(capture(text, /set out ([0-9]+) paper stars and some paper hearts/)[0]);
    const [starsPercent, heartsPercent] = capture(text,
      /([0-9]+)% of the stars and ([0-9]+)% of the hearts were left/).map(Number);
    const final = Number(capture(text, /bringing the number of stars to ([0-9]+)/)[0]);
    if (!text.includes('used the same number of stars as hearts')) throw new Error('Missing equal-use condition');
    if (!text.includes('added only paper stars')) throw new Error('Missing addition condition');
    const remaining = initial * starsPercent / 100;
    const used = initial - remaining;
    const hearts = initial * (100 - starsPercent) / (100 - heartsPercent);
    const heartsRemaining = hearts * heartsPercent / 100;
    return {
      kind: 'remaining', answers: [hearts, (final / remaining - 1) * 100],
      initial, remaining, final, used, hearts, heartsRemaining,
    };
  }
  if (text.includes('a tablet and a laptop')) {
    const total = readCents(capture(text,
      /paid [$]([0-9]+[.][0-9]{2}) altogether for a tablet and a laptop/)[0]);
    const difference = readCents(capture(text,
      /laptop cost [$]([0-9]+[.][0-9]{2}) more than the tablet after both discounts/)[0]);
    const [usualText, rateText] = capture(text,
      /tablet usually cost [$]([0-9]+[.][0-9]{2})[.] The laptop was sold at ([0-9]+)% off its usual price/);
    const tabletUsual = readCents(usualText);
    // Recover the more expensive price first, independently of the worked-step route.
    const laptopSale = (total + difference) / 2;
    const tabletSale = total - laptopSale;
    const laptopUsual = laptopSale * 100 / (100 - Number(rateText));
    return {
      kind: 'prices',
      answers: [100 * (tabletUsual - tabletSale) / tabletUsual, laptopUsual / 100],
      total, difference, tabletSale, laptopSale, tabletUsual, laptopUsual,
    };
  }
  throw new Error('Unrecognised visible question');
}

function storedAnswers(question: Question): number[] {
  return question.structuredResponse
    ? (JSON.parse(question.answer) as string[]).map(Number)
    : [Number(question.answer)];
}

function expectAnswers(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 9));
}

describe('percentage changes from recovered amounts', () => {
  it('solves hand-calculated visible examples without any stored answers', () => {
    const examples: {question: Visible; expected: number[]}[] = [
      {
        question: {
          prompt: 'Find the percentage discount.',
          context: ['A lunch bag was reduced by $18.00. Hana paid $72.00 for it in the sale.'],
        },
        expected: [20],
      },
      {
        question: {
          prompt: 'Find the initial hearts and the percentage increase in stars.',
          context: [
            'For an art session, Leela set out 240 paper stars and some paper hearts.',
            'The children used the same number of stars as hearts.',
            '40% of the stars and 25% of the hearts were left.',
            'Leela then added only paper stars, bringing the number of stars to 132.',
          ],
        },
        expected: [192, 37.5],
      },
      {
        question: {
          prompt: 'Find the tablet discount percentage and the usual laptop price.',
          context: [
            'At a shop sale, Farah paid $1759.00 altogether for a tablet and a laptop.',
            'The laptop cost $799.00 more than the tablet after both discounts.',
            'The tablet usually cost $640.00. The laptop was sold at 20% off its usual price.',
          ],
        },
        expected: [25, 1598.75],
      },
    ];
    for (const example of examples) {
      expectAnswers(solveVisible(example.question).answers, example.expected);
    }
  });

  it('independently solves all three variants across varied seeds and indices', () => {
    const seeds = [
      -2147483648, -17, -1, 0, 1, 2, 7, 101, 2147483647, 4294967295,
      ...Array.from({length: 80}, (_, i) => 19 + i * 7919),
    ];
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    let fractionalPercentSeen = false;
    let centsPriceSeen = false;
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const visible: Visible = {prompt: question.prompt, context: question.context};
        const solution = solveVisible(visible);
        const actual = storedAnswers(question);
        expectAnswers(actual, solution.answers);
        kinds.add(solution.kind);
        visibleQuestions.add(JSON.stringify(visible));
        expect(question.picture).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(question.workedSteps!.every(step => step.text.trim() && step.equation?.trim())).toBe(true);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(40);

        if (solution.kind === 'payment') {
          expect(question.unit).toBe('%');
          expect(question.structuredResponse).toBeUndefined();
          expect(solution.paid).toBeGreaterThan(0);
          expect(solution.discount).toBeGreaterThan(0);
          expect(solution.usual).toBeGreaterThan(solution.discount);
          expect([solution.paid, solution.discount, solution.usual].every(Number.isInteger)).toBe(true);
          expect(actual[0]).toBeGreaterThan(0);
          expect(actual[0]).toBeLessThan(100);
          const wrongBase = 100 * solution.discount / solution.paid;
          expect(Math.abs(actual[0] - wrongBase)).toBeGreaterThan(0.01);
        } else if (solution.kind === 'remaining') {
          expect([
            solution.initial, solution.remaining, solution.final, solution.used,
            solution.hearts, solution.heartsRemaining,
          ].every(value => Number.isInteger(value) && value > 0)).toBe(true);
          expect(solution.hearts - solution.heartsRemaining).toBe(solution.used);
          expect(solution.final).toBeGreaterThan(solution.remaining);
          expect(solution.final).toBeLessThan(solution.initial);
          expect(solution.hearts).toBeLessThanOrEqual(1200);
          const wrongBase = 100 * (solution.final - solution.remaining) / solution.initial;
          expect(Math.abs(actual[1] - wrongBase)).toBeGreaterThan(0.01);
          fractionalPercentSeen ||= !Number.isInteger(actual[1]);
        } else {
          expect([
            solution.total, solution.difference, solution.tabletSale, solution.laptopSale,
            solution.tabletUsual, solution.laptopUsual,
          ].every(value => Number.isInteger(value) && value > 0)).toBe(true);
          expect(solution.laptopSale + solution.tabletSale).toBe(solution.total);
          expect(solution.laptopSale - solution.tabletSale).toBe(solution.difference);
          expect(solution.laptopSale).toBeGreaterThan(solution.tabletSale);
          expect(solution.tabletUsual).toBeGreaterThan(solution.tabletSale);
          expect(solution.laptopUsual).toBeGreaterThan(solution.laptopSale);
          expect(actual[0]).toBeGreaterThan(0);
          expect(actual[0]).toBeLessThan(100);
          const wrongBase = 100 * (solution.tabletUsual - solution.tabletSale) / solution.tabletSale;
          expect(Math.abs(actual[0] - wrongBase)).toBeGreaterThan(0.01);
          centsPriceSeen ||= !Number.isInteger(actual[1]);
        }

        if (solution.kind !== 'payment') {
          expect(question.prompt).toContain('(a)');
          expect(question.prompt).toContain('(b)');
          const spec = question.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Both linked fields must be present');
          expect(spec.fields).toHaveLength(2);
          expect(spec.fields[0].label).toContain('(a)');
          expect(spec.fields[1].label).toContain('(b)');
          expect(spec.fields[1].decimal).toBe(true);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['payment', 'prices', 'remaining']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
    expect(fractionalPercentSeen).toBe(true);
    expect(centsPriceSeen).toBe(true);
  });

  it('uses supported controls to accept independent solutions and reject incomplete or swapped parts', () => {
    for (let seed = 0; seed < 24; seed++) {
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        const spec = question.structuredResponse;
        if (!spec) continue;
        const solution = solveVisible({prompt: question.prompt, context: question.context});
        const values = solution.answers.map(value => String(Number(value.toFixed(8))));
        const input = JSON.stringify(values);
        expect(structuredResponseReady(spec, input)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, input)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([...values].reverse()))).toBe(false);
        expect(structuredResponseReady(spec, JSON.stringify(values.slice(0, 1)))).toBe(false);
        const changed = [...values];
        changed[1] = String(Number(changed[1]) + 1);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(changed))).toBe(false);
      }
    }
  });

  it('is repeatable and provides all variants over consecutive indices', () => {
    for (const seed of [-17, 0, 1, 23, 999, 2147483647]) {
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      questions.forEach((question, index) => expect(makeRagQuestion(seed, index)).toEqual(question));
      expect(new Set(questions.map(question => question.key)).size).toBe(3);
      expect(new Set(questions.map(question => solveVisible({prompt: question.prompt, context: question.context}).kind)).size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-percentage-change-and-discount-rate');
    const allowedSkills = ['P6.S.PCT.01', 'P6.S.PCT.02', 'P5.S.PCT.03', 'P5.S.PCT.04'];
    expect(RAG_PATTERN.skillIds.every(id => allowedSkills.includes(id))).toBe(true);
  });
});
