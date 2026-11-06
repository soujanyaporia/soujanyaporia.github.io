import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragSinglePercentageChange';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  mode: 'pair' | 'single';
  percent: number;
  prices: number[];
  quantities: number[];
  totalCents: number;
  expectedCents: number[];
};

function readCents(text: string): number {
  const m = /^(\d+)\.(\d{2})$/.exec(text);
  if (!m) throw new Error(`Invalid visible money: ${text}`);
  return Number(m[1]) * 100 + Number(m[2]);
}

function dollars(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error('Expected exact non-negative cents');
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

// Only the pupil's prompt and context enter this solver. It calculates the
// retained price of each item separately, unlike the generator's total discount.
function solveVisible(q: Visible): Solution {
  const lines = q.context ?? [];
  const text = lines.join('\n');
  const rateMatches = [...text.matchAll(/(\d+)%/g)];
  if (rateMatches.length !== 1) throw new Error('Expected one visible discount rate');
  const percent = Number(rateMatches[0][1]);
  const purchase = /^Leena buys (\d+) paint set and (\d+) drawing pad\.$/m.exec(text);
  let prices: number[];
  let quantities: number[];
  let mode: 'pair' | 'single';

  if (purchase) {
    const paint = /^The paint set costs \$(\d+\.\d{2}) before the discount\.$/m.exec(text);
    const pad = /^The drawing pad costs \$(\d+\.\d{2}) before the discount\.$/m.exec(text);
    if (!paint || !pad || !q.prompt.includes('(a)') || !q.prompt.includes('(b)')) {
      throw new Error('Missing linked purchase givens or tasks');
    }
    prices = [readCents(paint[1]), readCents(pad[1])];
    quantities = [Number(purchase[1]), Number(purchase[2])];
    mode = 'pair';
  } else {
    const unit = /^One sketchbook costs \$(\d+\.\d{2}) before the discount\.$/m.exec(text);
    const count = /^Idris buys (\d+) sketchbooks\.$/m.exec(text);
    if (!unit || !count || !q.prompt.includes('all the sketchbooks')) {
      throw new Error('Missing unit-price purchase givens or task');
    }
    prices = [readCents(unit[1])];
    quantities = [Number(count[1])];
    mode = 'single';
  }

  const totalCents = prices.reduce((sum, price, i) => sum + price * quantities[i], 0);
  const paidCents = prices.reduce(
    (sum, price, i) => sum + (price * (100 - percent) / 100) * quantities[i],
    0,
  );
  if (!Number.isInteger(paidCents)) throw new Error('Visible givens require rounding');
  return {
    mode, percent, prices, quantities, totalCents,
    expectedCents: mode === 'pair' ? [totalCents - paidCents, paidCents] : [paidCents],
  };
}

const visible = (q: Question): Visible => ({prompt: q.prompt, context: q.context});

describe('single percentage change candidate', () => {
  it('independently solves both response variants from visible givens across varied seeds', () => {
    const seeds = [-2147483648, -101, -1, 2147483647, 4294967295,
      ...Array.from({length: 96}, (_, i) => i)];
    const modes = new Set<string>();
    const rates = new Set<number>();
    const quantities = new Set<number>();
    const questions = new Set<string>();
    let hasCentAnswer = false;

    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const s = solveVisible(visible(q));
        modes.add(s.mode);
        rates.add(s.percent);
        questions.add(JSON.stringify(visible(q)));
        expect(s.percent).toBeGreaterThanOrEqual(5);
        expect(s.percent).toBeLessThanOrEqual(40);
        expect(s.totalCents).toBeLessThanOrEqual(32200);
        for (const price of s.prices) {
          expect(price).toBeGreaterThan(0);
          expect(price % 100).toBe(0);
        }
        for (const amount of s.expectedCents) {
          expect(Number.isInteger(amount)).toBe(true);
          expect(amount).toBeGreaterThan(0);
          expect(amount).toBeLessThan(s.totalCents);
          hasCentAnswer ||= amount % 100 !== 0;
        }
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps).toHaveLength(3);
        expect(q.workedSteps?.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation).toContain(`$${dollars(s.totalCents)}`);
        for (const amount of s.expectedCents) {
          expect(q.explanation).toContain(`$${dollars(amount)}`);
        }

        if (s.mode === 'pair') {
          expect(s.quantities).toEqual([1, 1]);
          expect(q.structuredResponse).toEqual({
            kind: 'number-pair', firstLabel: '(a) Discount ($)',
            secondLabel: '(b) Amount paid ($)', decimal: true,
          });
          expect(JSON.parse(q.answer)).toEqual(s.expectedCents.map(dollars));
          expect(s.expectedCents[0] + s.expectedCents[1]).toBe(s.totalCents);
        } else {
          const count = s.quantities[0];
          quantities.add(count);
          expect(count).toBeGreaterThanOrEqual(3);
          expect(count).toBeLessThanOrEqual(7);
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(q.answer).toBe(dollars(s.expectedCents[0]));
        }
      }
    }
    expect([...modes].sort()).toEqual(['pair', 'single']);
    expect(rates.size).toBe(6);
    expect(quantities.size).toBe(5);
    expect(questions.size).toBeGreaterThan(100);
    expect(hasCentAnswer).toBe(true);
  });

  it('uses the existing pair grader without losing the order of linked answers', () => {
    for (let seed = 0; seed < 32; seed++) {
      for (let index = 0; index < 2; index++) {
        const q = makeRagQuestion(seed, index);
        const s = solveVisible(visible(q));
        if (s.mode !== 'pair') continue;
        const spec = q.structuredResponse;
        if (!spec) throw new Error('Linked answers need a structured response');
        const expected = s.expectedCents.map(dollars);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
        const equivalent = expected.map(value => String(Number(value)));
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(equivalent))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...expected].reverse()))).toBe(false);
        const wrong = [dollars(s.expectedCents[0] + 1), expected[1]];
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0]]))).toBe(false);
      }
    }
  });

  it('is deterministic and presents both variants within two consecutive indices', () => {
    for (const seed of [-17, 0, 1, 42, 987654321]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const modes = new Set<string>();
      for (let index = 0; index < 2; index++) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        modes.add(solveVisible(visible(q)).mode);
      }
      expect(modes.size).toBe(2);
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('single-percentage-change');
  });
});
