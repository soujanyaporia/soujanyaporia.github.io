import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragBudgetLimitedPurchases';

type Visible = Pick<Question, 'context' | 'prompt'>;

function cents(value: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid visible money: ${value}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

// This solver receives only pupil-visible text. It buys one pack or item
// at a time, independently of the generator's division and stored answer.
function solveVisible(visible: Visible) {
  const text = [...(visible.context ?? []), visible.prompt].join(' ');
  const budget = cents(capture(text, / has \$(\d+\.\d{2}) for shopping\./)[1]);
  const pack = /Crayons come in packs of (\d+)\. Each pack costs \$(\d+\.\d{2})\./.exec(text);
  const prior = /first buys (\d+) notebooks at \$(\d+\.\d{2}) each\./.exec(text);
  let available = budget;
  let priorCost = 0;
  if (prior) {
    const each = cents(prior[2]);
    for (let i = 0; i < Number(prior[1]); i++) {
      available -= each;
      priorCost += each;
    }
  }
  const size = pack ? Number(pack[1]) : 1;
  const price = pack
    ? cents(pack[2])
    : cents(capture(text, /A (?:key ring|pencil) costs \$(\d+\.\d{2})\./)[1]);
  if (available < 0 || price <= 0 || size < 1) throw new Error('Invalid purchase givens');
  let remaining = available;
  let purchases = 0;
  let items = 0;
  while (remaining >= price) {
    remaining -= price;
    purchases++;
    items += size;
  }
  return {
    budget, available, priorCost, price, size, remaining, purchases, items,
    kind: pack ? 'packages' : prior ? 'additional' : 'units',
    unit: pack ? 'crayons' : prior ? 'pencils' : 'key rings',
  };
}

function amount(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

const seeds = Array.from({length: 80}, (_, i) => i - 16);

describe('budget-limited purchases', () => {
  it('independently finds the maximal affordable item count across seeds and indices', () => {
    const kinds = new Set<string>();
    const boundaries = new Set<string>();
    const presentations = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const result = solveVisible({context: q.context, prompt: q.prompt});
        const expected = String(result.items);
        expect(q.answer).toBe(expected);
        expect(q.unit).toBe(result.unit);
        expect(result.purchases * result.price).toBeLessThanOrEqual(result.available);
        expect((result.purchases + 1) * result.price).toBeGreaterThan(result.available);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
        expect(result.remaining).toBeLessThan(result.price);
        expect(result.items % result.size).toBe(0);
        expect(result.budget).toBeLessThan(100000);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toContain(`${expected} ${result.unit}`);
        const equations = (q.workedSteps ?? []).map(step => step.equation ?? '').join('\n');
        expect(equations).toContain(`${amount(result.available)} ÷ ${amount(result.price)}`);
        expect(equations).toContain(`with ${amount(result.remaining)} left`);
        expect(equations).toContain(`${result.purchases + 1} × ${amount(result.price)} = ${amount((result.purchases + 1) * result.price)} > ${amount(result.available)}`);
        if (result.kind === 'packages') {
          expect(q.context?.join(' ')).toContain('Only complete packs are sold');
          expect(equations).toContain(`${result.purchases} × ${result.size} = ${expected} crayons`);
          expect(q.workedSteps).toHaveLength(3);
        } else if (result.kind === 'additional') {
          expect(q.prompt).toContain('money left');
          expect(equations).toContain(`${amount(result.budget)} − ${amount(result.priorCost)} = ${amount(result.available)}`);
          expect(q.workedSteps).toHaveLength(4);
        } else {
          expect(q.workedSteps).toHaveLength(2);
        }
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
          expect(q.choices.every(choice => /^\d+$/.test(choice))).toBe(true);
          presentations.add('choice');
        } else {
          presentations.add('entry');
        }
        kinds.add(result.kind);
        if (result.remaining === 0) boundaries.add(`${result.kind}:exact`);
        const step = result.kind === 'packages' ? 100 : 1;
        if (result.remaining === result.price - step) boundaries.add(`${result.kind}:just-short`);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
      }
    }
    expect([...kinds].sort()).toEqual(['additional', 'packages', 'units']);
    expect([...presentations].sort()).toEqual(['choice', 'entry']);
    for (const kind of ['additional', 'packages', 'units']) {
      expect(boundaries.has(`${kind}:exact`)).toBe(true);
      expect(boundaries.has(`${kind}:just-short`)).toBe(true);
    }
    expect(visibleQuestions.size).toBeGreaterThan(200);
  });

  it('checks the visible solver against hand-calculated boundary examples', () => {
    const pack = solveVisible({
      context: ['Hana has $53.00 for shopping.', 'Crayons come in packs of 4. Each pack costs $18.00.', 'Only complete packs are sold; crayons cannot be bought separately.'],
      prompt: 'What is the greatest number of crayons Hana can buy?',
    });
    expect(pack.items).toBe(8);
    const units = solveVisible({
      context: ['Dev has $11.99 for shopping.', 'A key ring costs $2.40. Key rings are sold separately.'],
      prompt: 'What is the greatest number of key rings Dev can buy?',
    });
    expect(units.items).toBe(4);
    const additional = solveVisible({
      context: ['Alya has $17.00 for shopping.', 'Alya first buys 3 notebooks at $2.20 each.', 'A pencil costs $1.60. Pencils are sold separately.'],
      prompt: 'What is the greatest number of pencils Alya can buy with the money left?',
    });
    expect(additional.items).toBe(6);
    expect(additional.remaining).toBe(80);
  });

  it('is repeatable, varies the visible givens and exports the required metadata', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('budget-limited-purchases');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.02', 'P4.S.DEC.05']);
    for (const seed of [-2147483648, -1, 0, 1, 37, 2147483647]) {
      const keys = new Set<string>();
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        keys.add(first.key);
        kinds.add(solveVisible({context: first.context, prompt: first.prompt}).kind);
      }
      expect(keys.size).toBe(3);
      expect(kinds.size).toBe(3);
    }
    expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  });
});
