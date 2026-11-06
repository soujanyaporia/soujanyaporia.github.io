import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragFreeUnitPromotions';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'unit'>;

function readVisibleGivens(q: VisibleQuestion) {
  const text = (q.context ?? []).join('\n');
  const price = /Each paid place costs \$(\d+)\.(\d{2})\./.exec(text);
  const offer = /Every (\d+) paid places earn 1 extra place free\./.exec(text);
  const payment = /The booking costs \$(\d+)\.(\d{2}) in all\./.exec(text);
  if (!price || !offer || !payment) throw new Error('Missing visible promotion givens');
  if (!text.includes('The offer is applied to the whole booking.') ||
      !text.includes('Every free place earned is used.') ||
      !text.includes('Each person uses exactly one place.') ||
      !text.includes('There are no other charges.')) {
    throw new Error('The visible booking rules must determine a unique group size');
  }
  const priceCents = Number(price[1]) * 100 + Number(price[2]);
  const paymentCents = Number(payment[1]) * 100 + Number(payment[2]);
  const threshold = Number(offer[1]);
  if (priceCents <= 0 || paymentCents <= 0 || threshold < 2) {
    throw new Error('Invalid visible amounts');
  }
  return {priceCents, paymentCents, threshold};
}

// Simulate admitting people one paid place at a time. This does not read
// answers, explanations, worked steps, seeds or generation parameters.
function solveVisible(q: VisibleQuestion): number {
  const {priceCents, paymentCents, threshold} = readVisibleGivens(q);
  let spent = 0;
  let people = 0;
  let paidSinceFreePlace = 0;
  while (spent < paymentCents) {
    spent += priceCents;
    people += 1;
    paidSinceFreePlace += 1;
    if (paidSinceFreePlace === threshold) {
      people += 1;
      paidSinceFreePlace = 0;
    }
    if (people > 1000) throw new Error('Unexpectedly large group');
  }
  if (spent !== paymentCents) throw new Error('Payment does not buy whole paid places');
  return people;
}

function visibleFixture(payment: string): VisibleQuestion {
  return {
    context: [
      'Each paid place costs $12.00.',
      'Every 4 paid places earn 1 extra place free. The offer is applied to the whole booking.',
      'Every free place earned is used. Each person uses exactly one place.',
      `The booking costs $${payment} in all. There are no other charges.`,
    ],
    prompt: 'How many people are in the group?',
    unit: 'people',
  };
}

describe('free places earned by paying participants', () => {
  it('independently handles either side of a promotional boundary', () => {
    expect(solveVisible(visibleFixture('36.00'))).toBe(3);
    expect(solveVisible(visibleFixture('48.00'))).toBe(5);
    expect(solveVisible(visibleFixture('60.00'))).toBe(6);
    expect(solveVisible(visibleFixture('132.00'))).toBe(13);
    expect(solveVisible(visibleFixture('144.00'))).toBe(15);
  });

  it('solves generated questions using only their visible givens across varied seeds', () => {
    const thresholds = new Set<number>();
    const prices = new Set<number>();
    const visibleQuestions = new Set<string>();
    let exactBoundary = false;
    let oneShortOfNextGroup = false;
    let otherRemainder = false;

    for (let seed = -30; seed <= 70; seed += 1) {
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        const visible: VisibleQuestion = {
          context: q.context,
          prompt: q.prompt,
          unit: q.unit,
        };
        const expected = solveVisible(visible);
        expect(q.answer).toBe(String(expected));
        expect(q.unit).toBe('people');
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps).toHaveLength(3);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        const givens = readVisibleGivens(visible);
        const paid = givens.paymentCents / givens.priceCents;
        expect(Number.isInteger(paid)).toBe(true);
        expect(paid).toBeGreaterThanOrEqual(givens.threshold);
        expect(paid).toBeLessThanOrEqual(89);
        expect(expected).toBeGreaterThan(paid);
        expect(expected).toBeLessThanOrEqual(98);
        expect(givens.paymentCents).toBeLessThanOrEqual(213600);
        expect(givens.priceCents % 100).toBe(0);

        const remainder = paid % givens.threshold;
        exactBoundary ||= remainder === 0;
        oneShortOfNextGroup ||= remainder === givens.threshold - 1;
        otherRemainder ||= remainder > 0 && remainder < givens.threshold - 1;
        if (remainder > 0) {
          // Treating an incomplete paying group as a fraction of a free
          // participant must not produce the accepted whole-person answer.
          expect(Number(q.answer)).not.toBe(paid + paid / givens.threshold);
        }
        thresholds.add(givens.threshold);
        prices.add(givens.priceCents);
        visibleQuestions.add(JSON.stringify(visible));
      }
    }

    expect([...thresholds].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 9]);
    expect(prices.size).toBe(7);
    expect(exactBoundary).toBe(true);
    expect(oneShortOfNextGroup).toBe(true);
    expect(otherRemainder).toBe(true);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is reproducible and supplies the required family metadata', () => {
    for (const seed of [-123, 0, 1, 2026, 2147483647]) {
      for (const index of [0, 1, 7, 31]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-free-unit-promotions');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.02']);
  });
});
