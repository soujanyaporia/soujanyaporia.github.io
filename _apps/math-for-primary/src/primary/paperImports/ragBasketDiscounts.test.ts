import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragBasketDiscounts';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  answer: string;
  kind: 'toys' | 'tickets';
  firstToyCheaper?: boolean;
  atAgeBoundary?: boolean;
};

function match(text: string, pattern: RegExp): RegExpMatchArray {
  const result = text.match(pattern);
  if (!result) throw new Error(`Missing visible given: ${pattern}`);
  return result;
}

function cents(decimal: string): number {
  if (!/^\d+\.\d{2}$/.test(decimal)) throw new Error('Expected dollars and cents');
  const [whole, part] = decimal.split('.');
  return Number(whole) * 100 + Number(part);
}

function decimal(amount: number): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid cent amount');
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, '0')}`;
}

// This solver receives only pupil-visible text. It subtracts savings from
// full prices, independently of the generator's percentage-left method.
function solveVisible(q: VisibleQuestion): Solution {
  const text = q.context?.join('\n') ?? '';
  if (text.includes('A toy shop')) {
    const rates = match(text, /The higher-priced toy gets (\d+)% off\. The lower-priced toy gets (\d+)% off\./);
    const equalRates = match(text, /If the two toys have the same usual price, one gets (\d+)% off and the other gets (\d+)% off\./);
    const prices = match(text, /a kite with a usual price of \$(\d+\.\d{2}) and a puzzle with a usual price of \$(\d+\.\d{2})\./);
    const saving = match(text, /The total discount on the two buses is \$(\d+\.\d{2})\./);
    const higherPriceRate = Number(rates[1]);
    const lowerPriceRate = Number(rates[2]);
    if (!(higherPriceRate > 0 && higherPriceRate < lowerPriceRate && lowerPriceRate < 100)) {
      throw new Error('Invalid ordered discount rates');
    }
    if (rates[1] !== equalRates[1] || rates[2] !== equalRates[2]) {
      throw new Error('The linked parts must share one offer');
    }
    const kite = cents(prices[1]);
    const puzzle = cents(prices[2]);
    const ordered = [kite, puzzle].sort((a, b) => a - b);
    if (ordered[0] === ordered[1]) throw new Error('Part (a) needs unequal prices');
    const savings = ordered[0] * lowerPriceRate / 100 + ordered[1] * higherPriceRate / 100;
    const amountPaid = kite + puzzle - savings;
    const totalSaving = cents(saving[1]);
    const combinedRate = Number(equalRates[1]) + Number(equalRates[2]);
    const onePrice = totalSaving * 100 / combinedRate;
    if (onePrice * Number(equalRates[1]) / 100 + onePrice * Number(equalRates[2]) / 100 !== totalSaving) {
      throw new Error('Recovered price does not satisfy both discounts');
    }
    return {
      kind: 'toys',
      answer: JSON.stringify([decimal(amountPaid), decimal(onePrice)]),
      firstToyCheaper: kite < puzzle,
    };
  }

  const price = match(text, /The usual cinema ticket price is \$(\d+\.\d{2})\./);
  const offer = match(text, /Children younger than (\d+) years get a (\d+)% discount\. Everyone else pays the usual price\./);
  const family = match(text, /A family has (\d+) adults and (\d+) children\. The children are (\d+) and (\d+) years old\./);
  if (!text.includes('Each person buys one ticket.')) throw new Error('Missing ticket count rule');
  const usualPrice = cents(price[1]);
  const cutoff = Number(offer[1]);
  const rate = Number(offer[2]);
  const adults = Number(family[1]);
  const childCount = Number(family[2]);
  const ages = [Number(family[3]), Number(family[4])];
  if (childCount !== ages.length) throw new Error('Missing child age');
  if (!(rate > 0 && rate < 100)) throw new Error('Invalid ticket discount');
  let totalSaving = 0;
  for (const age of ages) {
    if (age < cutoff) totalSaving += usualPrice * rate / 100;
  }
  return {
    kind: 'tickets',
    answer: decimal((adults + childCount) * usualPrice - totalSaving),
    atAgeBoundary: ages.includes(cutoff),
  };
}

function visible(q: Question): VisibleQuestion {
  return {prompt: q.prompt, context: q.context};
}

describe('basket discounts candidate', () => {
  it('independently solves both linked parts in a hand-calculated example', () => {
    const q: VisibleQuestion = {
      prompt: '(a) Find the payment. (b) Find one bus price.',
      context: [
        'A toy shop offers a discount when a customer buys exactly 2 toys.',
        'The higher-priced toy gets 15% off. The lower-priced toy gets 40% off.',
        'If the two toys have the same usual price, one gets 15% off and the other gets 40% off.',
        '(a) Isha buys a kite with a usual price of $27.00 and a puzzle with a usual price of $44.00.',
        '(b) Noah buys 2 identical model buses. The total discount on the two buses is $22.00.',
      ],
    };
    expect(solveVisible(q).answer).toBe('["53.60","40.00"]');
  });

  it('charges the full price at the exact age cutoff', () => {
    const q: VisibleQuestion = {
      prompt: 'Find the total ticket cost.',
      context: [
        'The usual cinema ticket price is $16.50.',
        'Children younger than 13 years get a 30% discount. Everyone else pays the usual price.',
        'A family has 2 adults and 2 children. The children are 12 and 13 years old.',
        'Each person buys one ticket.',
      ],
    };
    expect(solveVisible(q)).toEqual({kind: 'tickets', answer: '61.05', atAgeBoundary: true});
  });

  it('matches visible-givens solutions across varied seeds and indices', () => {
    const seeds = [-2147483648, -101, -1, ...Array.from({length: 96}, (_, i) => i), 2147483647];
    const kinds = new Set<string>();
    const priceOrders = new Set<boolean>();
    const ageBoundaries = new Set<boolean>();
    const questions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        expect(q.answer).toBe(solved.answer);
        kinds.add(solved.kind);
        questions.add(JSON.stringify(visible(q)));
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps!.every(step => Boolean(step.text && step.equation))).toBe(true);
        expect(q.explanation).toContain(q.workedSteps![0].text);
        expect(q.picture).toBeUndefined();

        if (solved.kind === 'toys') {
          priceOrders.add(solved.firstToyCheaper!);
          expect(q.prompt).toContain('(a)');
          expect(q.prompt).toContain('(b)');
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Expected linked numeric fields');
          expect(spec.fields).toHaveLength(2);
          expect(spec.fields.every(field => field.decimal && field.label.includes('$'))).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, solved.answer)).toBe(true);
          const values = JSON.parse(solved.answer) as string[];
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([values[0]]))).toBe(false);
          for (let field = 0; field < 2; field++) {
            const wrong = [...values];
            wrong[field] = decimal(cents(wrong[field]) + 1);
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
          }
        } else {
          ageBoundaries.add(solved.atAgeBoundary!);
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['tickets', 'toys']);
    expect(priceOrders.size).toBe(2);
    expect(ageBoundaries.size).toBe(2);
    expect(questions.size).toBeGreaterThan(100);
  });

  it('is deterministic and declares the intended curriculum family', () => {
    for (const seed of [-7, 0, 3, 123456789]) {
      for (let index = 0; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(makeRagQuestion(seed, index).key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
      }
    }
    expect(makeRagQuestion(9)).toEqual(makeRagQuestion(9, 0));
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-basket-discounts');
    expect([...RAG_PATTERN.skillIds]).toEqual(['P5.S.PCT.03', 'P5.S.PCT.04']);
  });
});
