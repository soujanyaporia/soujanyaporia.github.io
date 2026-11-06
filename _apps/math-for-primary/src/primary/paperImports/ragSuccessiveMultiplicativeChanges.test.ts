import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragSuccessiveMultiplicativeChanges';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

function readVisibleGivens(q: VisibleQuestion) {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  const price = /price before any discount or GST is \$(\d+)\.(\d{2})\./.exec(text);
  const discount = /a (\d+)% discount/.exec(text);
  const gst = /GST of (\d+)% is then added to the discounted price/.exec(text);
  if (!price || !discount || !gst) {
    throw new Error('The visible question must supply the price, discount and GST base.');
  }
  return {
    priceCents: Number(price[1]) * 100 + Number(price[2]),
    discount: Number(discount[1]),
    gst: Number(gst[1]),
  };
}

// Independently subtract the discount amount and then add the tax amount.
// This solver receives only visible text, never an answer or generation parameters.
function solveVisible(q: VisibleQuestion) {
  const givens = readVisibleGivens(q);
  const discountCents = givens.priceCents / 100 * givens.discount;
  const discountedCents = givens.priceCents - discountCents;
  const gstCents = discountedCents / 100 * givens.gst;
  return {
    ...givens,
    discountCents,
    discountedCents,
    gstCents,
    totalCents: discountedCents + gstCents,
  };
}

function moneyToCents(value: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a dollar amount with two decimal places: ${value}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

const formatCents = (value: number): string =>
  `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;

const seeds = [
  0, 1, -1, 2147483647, -2147483648, 4294967295,
  ...Array.from({length: 100}, (_, i) => 17 + i * 7919),
];

describe('successive discount and GST', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const prices = new Set<number>();
    const discounts = new Set<number>();
    const rates = new Set<number>();
    const modes = new Set<string>();
    let fractionalDollarAnswers = 0;

    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        prices.add(solved.priceCents);
        discounts.add(solved.discount);
        rates.add(solved.gst);
        modes.add(q.choices ? 'choice' : 'entry');

        expect(solved.priceCents).toBeGreaterThanOrEqual(6000);
        expect(solved.priceCents).toBeLessThanOrEqual(48000);
        expect(solved.priceCents % 2000).toBe(0);
        expect([20000, 25000, 40000]).not.toContain(solved.priceCents);
        expect(solved.discount).toBeGreaterThanOrEqual(10);
        expect(solved.discount).toBeLessThanOrEqual(40);
        expect(solved.discount % 5).toBe(0);
        expect([7, 8, 9]).toContain(solved.gst);
        for (const cents of [solved.discountCents, solved.discountedCents, solved.gstCents, solved.totalCents]) {
          expect(Number.isSafeInteger(cents)).toBe(true);
          expect(cents).toBeGreaterThan(0);
        }
        expect(moneyToCents(q.answer)).toBe(solved.totalCents);
        expect(q.unit).toBe('dollars');
        expect(q.picture).toBeUndefined();
        expect(solved.totalCents).toBeGreaterThan(solved.discountedCents);
        expect(solved.totalCents).toBeLessThan(solved.priceCents);
        if (solved.totalCents % 100 !== 0) fractionalDollarAnswers++;

        // Combining the two percentages additively uses the wrong GST base.
        const additiveShortcut = solved.priceCents * (100 - solved.discount + solved.gst) / 100;
        expect(moneyToCents(q.answer)).not.toBe(additiveShortcut);
        expect(moneyToCents(q.answer)).not.toBe(solved.discountedCents);

        if (q.choices) {
          const options = q.choices.map(moneyToCents);
          expect(options).toHaveLength(4);
          expect(new Set(options).size).toBe(4);
          expect(options.every(value => value > 0)).toBe(true);
          expect(options.filter(value => value === solved.totalCents)).toHaveLength(1);
        }
      }
    }

    expect(prices.size).toBeGreaterThanOrEqual(10);
    expect(discounts.size).toBeGreaterThanOrEqual(5);
    expect([...rates].sort()).toEqual([7, 8, 9]);
    expect([...modes].sort()).toEqual(['choice', 'entry']);
    expect(fractionalDollarAnswers).toBeGreaterThan(0);
  });

  it('shows correct intermediate amounts and taxes the reduced price', () => {
    for (const seed of [3, 29, 101, 911, -37]) {
      const q = makeRagQuestion(seed, 2);
      const s = solveVisible({context: q.context, prompt: q.prompt});
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations).toEqual([
        `100% − ${s.discount}% = ${100 - s.discount}%`,
        `$${formatCents(s.priceCents)} × ${100 - s.discount}/100 = $${formatCents(s.discountedCents)}`,
        `$${formatCents(s.discountedCents)} × ${s.gst}/100 = $${formatCents(s.gstCents)}`,
        `$${formatCents(s.discountedCents)} + $${formatCents(s.gstCents)} = $${formatCents(s.totalCents)}`,
      ]);
      expect(q.workedSteps?.every(step => step.text.trim().length > 0)).toBe(true);
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.explanation).toContain(`$${formatCents(s.totalCents)}`);
    }
  });

  it('is deterministic and exposes the required family metadata', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-successive-multiplicative-changes');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.PCT.03', 'P5.S.PCT.04']);
    const keys = new Set<string>();
    const contexts = new Set<string>();
    for (let index = 0; index < 16; index++) {
      const q = makeRagQuestion(1337, index);
      expect(makeRagQuestion(1337, index)).toEqual(q);
      keys.add(q.key);
      contexts.add(JSON.stringify(q.context));
    }
    expect(keys.size).toBe(16);
    expect(contexts.size).toBeGreaterThan(1);
    expect(makeRagQuestion(1337)).toEqual(makeRagQuestion(1337, 0));
  });
});
