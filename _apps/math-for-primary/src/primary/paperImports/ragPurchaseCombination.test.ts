import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPurchaseCombination';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Offer = {quantity: number; price: number};

function readMoney(value: string): number {
  const match = /^\$(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error(`Invalid visible price: ${value}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function readVisible(q: VisibleQuestion) {
  const picture = q.picture;
  if (!picture || picture.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing visible price cards');
  return {cards: picture.cards, text: [...(q.context ?? []), q.prompt].join(' ')};
}

function readGoods(q: VisibleQuestion): Offer[] {
  return readVisible(q).cards.map(card => {
    const match = /^(?:Pack of )?(\d+) (?:notebooks?|muffins?)$/.exec(card.label);
    if (!match) throw new Error(`Unrecognised visible quantity: ${card.label}`);
    return {quantity: Number(match[1]), price: readMoney(card.value)};
  });
}

// Independent solver: shortest costs by quantity, rather than enumerating pack counts.
function exactCost(offers: Offer[], target: number): number {
  const costs = Array<number>(target + 1).fill(Infinity);
  costs[0] = 0;
  for (let n = 1; n <= target; n++) {
    for (const offer of offers) {
      if (offer.quantity <= n) costs[n] = Math.min(costs[n], costs[n - offer.quantity] + offer.price);
    }
  }
  return costs[target];
}

// Compute every reachable expenditure; money need not all be spent.
function maximumWithinBudget(offers: Offer[], budget: number): number {
  const counts = Array<number>(budget + 1).fill(-Infinity);
  counts[0] = 0;
  for (let spent = 1; spent <= budget; spent++) {
    for (const offer of offers) {
      if (offer.price <= spent) counts[spent] = Math.max(counts[spent], counts[spent - offer.price] + offer.quantity);
    }
  }
  return counts.reduce((best, n) => Math.max(best, n), 0);
}

function readBudget(q: VisibleQuestion): number {
  const match = /for (\d+) bread rolls, sold in packs of (\d+) for (\$\d+\.\d{2}) per pack/.exec(readVisible(q).text);
  if (!match) throw new Error('Missing original-budget givens');
  const count = Number(match[1]), size = Number(match[2]);
  if (count % size !== 0) throw new Error('Original purchase must use whole packs');
  return count / size * readMoney(match[3]);
}

function solveVisible(q: VisibleQuestion): string {
  const {cards, text} = readVisible(q);
  if (text.includes('bread rolls')) {
    const target = /exactly (\d+) muffins/.exec(text);
    if (!target) throw new Error('Missing muffin target');
    const offers = readGoods(q), budget = readBudget(q);
    const greatest = maximumWithinBudget(offers, budget);
    const extra = exactCost(offers, Number(target[1])) - budget;
    return JSON.stringify([String(greatest), (extra / 100).toFixed(2)]);
  }
  if (cards.some(card => card.label.includes('adult ticket'))) {
    const required = /exactly (\d+) adults and (\d+) children/.exec(text);
    if (!required) throw new Error('Missing ticket requirements');
    const adults = Number(required[1]), children = Number(required[2]);
    const offers = cards.map(card => ({
      adults: Number(/(\d+) adult ticket/.exec(card.label)?.[1] ?? 0),
      children: Number(/(\d+) child ticket/.exec(card.label)?.[1] ?? 0),
      price: readMoney(card.value),
    }));
    const costs = Array.from({length: adults + 1}, () => Array<number>(children + 1).fill(Infinity));
    costs[0][0] = 0;
    for (let a = 0; a <= adults; a++) {
      for (let c = 0; c <= children; c++) {
        for (const offer of offers) {
          if (a >= offer.adults && c >= offer.children) {
            costs[a][c] = Math.min(costs[a][c], costs[a - offer.adults][c - offer.children] + offer.price);
          }
        }
      }
    }
    return (costs[adults][children] / 100).toFixed(2);
  }
  const target = /exactly (\d+) notebooks/.exec(text);
  if (!target) throw new Error('Missing notebook target');
  return (exactCost(readGoods(q), Number(target[1])) / 100).toFixed(2);
}

const seeds = [0, 1, -1, 42, 65535, 2147483647, 4294967295, ...Array.from({length: 80}, (_, i) => i * 101 - 4000)];

describe('purchase-combination candidate', () => {
  it('matches independent visible-givens solutions across varied seeds and all variants', () => {
    const variants = new Set<string>();
    const givens = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(q);
        expect(q.answer).toBe(expected);
        const {cards, text} = readVisible(q);
        cards.forEach(card => expect(readMoney(card.value)).toBeGreaterThan(0));
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.explanation).toContain(q.workedSteps![q.workedSteps!.length - 1].equation);
        givens.add(JSON.stringify([q.prompt, q.context, q.picture]));
        if (text.includes('bread rolls')) variants.add('linked-budget');
        else if (text.includes('adult')) variants.add('two-types');
        else variants.add('packs-and-singles');
        if (!q.structuredResponse) {
          expect(q.unit).toBe('dollars');
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
        }
      }
    }
    expect([...variants].sort()).toEqual(['linked-budget', 'packs-and-singles', 'two-types']);
    expect(givens.size).toBeGreaterThan(80);
  });

  it('preserves both linked parts, the original budget and distinct response units', () => {
    let reviewed = 0;
    for (const seed of seeds.slice(0, 30)) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        if (!q.structuredResponse) continue;
        reviewed++;
        expect(q.structuredResponse).toEqual({kind: 'number-fields', fields: [
          {label: '(a) Number of muffins'},
          {label: '(b) Extra money ($)', decimal: true},
        ]});
        const {text} = readVisible(q);
        expect(text).toContain('(a)');
        expect(text).toContain('(b)');
        expect(text).toContain('For each part, start with all of the original money.');
        expect(text).toContain('may leave some money unspent');
        const result: string[] = JSON.parse(solveVisible(q));
        expect(Number.isInteger(Number(result[0]))).toBe(true);
        expect(Number(result[0])).toBeGreaterThan(0);
        expect(Number(result[1])).toBeGreaterThan(0);
        const target = Number(/exactly (\d+) muffins/.exec(text)![1]);
        expect(Number(result[0])).toBeLessThan(target);
        expect(exactCost(readGoods(q), target)).toBeGreaterThan(readBudget(q));
      }
    }
    expect(reviewed).toBe(30);
  });

  it('is deterministic, varies index, and uses the declared curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-purchase-combination-optimization');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const permitted = new Set(['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06']);
    RAG_PATTERN.skillIds.forEach(id => expect(permitted.has(id)).toBe(true));
    for (const seed of seeds.slice(0, 12)) {
      for (const index of [-2, -1, 0, 1, 2, 7]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const questions = [0, 1, 2].map(index => makeRagQuestion(seed, index));
      expect(new Set(questions.map(q => q.key)).size).toBe(3);
      expect(new Set(questions.map(q => q.prompt)).size).toBe(3);
    }
  });

  it('checks non-greedy combinations and allows change in budget optimization', () => {
    const offers = [{quantity: 1, price: 200}, {quantity: 3, price: 500}, {quantity: 5, price: 850}];
    // Two packs of three cost less than a pack of five and a single.
    expect(exactCost(offers, 6)).toBe(1000);
    expect(exactCost(offers, 6)).toBeLessThan(850 + 200);
    expect(maximumWithinBudget([{quantity: 1, price: 300}, {quantity: 3, price: 800}], 1000)).toBe(3);
  });

  it('derives its result from visible prices independently of stored answers', () => {
    const q = [0, 1, 2].map(index => makeRagQuestion(17, index)).find(item => readVisible(item).text.includes('notebooks'))!;
    const original = solveVisible(q);
    expect(solveVisible({...q, answer: '999999'} as Question)).toBe(original);
    const picture = q.picture;
    if (!picture || picture.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing price cards');
    const doubled: VisibleQuestion = {...q, picture: {...picture, cards: picture.cards.map(card => ({
      ...card, value: `$${(2 * readMoney(card.value) / 100).toFixed(2)}`,
    }))}};
    expect(solveVisible(doubled)).toBe((2 * Number(original)).toFixed(2));
  });
});
