import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragWholePackPricing';

function read(text: string, pattern: RegExp): number[] {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing visible purchase information for ${pattern}`);
  const values = match.slice(1).map(Number);
  for (const value of values) {
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(1000);
  }
  return values;
}

// Buy one pack at a time, counting items until the next pack is out of reach.
function basket(money: number, size: number, price: number) {
  let items = 0;
  let left = money;
  while (left >= price) {
    left -= price;
    items += size;
  }
  return { items, left };
}

function priceOrder(items: number, size: number, price: number): number {
  let filled = 0;
  let total = 0;
  while (filled < items) {
    filled += size;
    total += price;
  }
  expect(filled).toBe(items);
  return total;
}

test('solves every purchase form from the displayed terms and each shopper’s own givens', () => {
  const forms = new Set<string>();
  const verdicts = new Set<string>();
  const winners = new Set<string>();
  const leftovers = new Set<string>();
  for (let seed = 1; seed <= 64; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const text = [...(q.context ?? []), q.prompt].join('\n');
      if (text.includes('Fern Stall')) {
        forms.add('compare');
        const [quantity] = read(text, /needs exactly (\d+) bookmarks/);
        const costs = ['Fern Stall', 'Palm Stall'].map(name => {
          const [size, price] = read(text, new RegExp(`At ${name}, a pack of (\\d+) bookmarks costs \\$(\\d+)`));
          return priceOrder(quantity, size, price);
        });
        expect(costs[0]).not.toBe(costs[1]);
        const winner = costs[0] < costs[1] ? 'Fern Stall' : 'Palm Stall';
        winners.add(winner);
        expect(q.choices?.slice().sort()).toEqual(['Fern Stall', 'Palm Stall']);
        expect(q.answer).toBe(winner);
        continue;
      }

      const [size, price] = read(text, /Each pack holds (\d+) bookmarks and costs \$(\d+)/);
      if (text.includes('Hana spent')) {
        forms.add('claims');
        const [spent] = read(text, /Hana spent exactly \$(\d+)/);
        const [claim] = read(text, /A\. Hana bought (\d+) bookmarks/);
        const [other, claimedSaving] = read(text, /B\. If Hana had bought (\d+) bookmarks instead, she would have saved \$(\d+)/);
        const actual = basket(spent, size, price);
        expect(actual.left).toBe(0);
        expect(other).toBeLessThan(actual.items);
        const saving = spent - priceOrder(other, size, price);
        const verdict = `A: ${claim === actual.items ? 'True' : 'False'}, B: ${claimedSaving === saving ? 'True' : 'False'}`;
        verdicts.add(verdict);
        expect(new Set(q.choices)).toEqual(new Set(['A: True, B: True', 'A: True, B: False', 'A: False, B: True', 'A: False, B: False']));
        expect(q.answer).toBe(verdict);
        continue;
      }

      const [budget] = read(text, /Mei has \$(\d+) to spend/);
      const actual = basket(budget, size, price);
      expect(actual.left).toBeGreaterThan(0);
      expect(priceOrder(actual.items, size, price)).toBeLessThanOrEqual(budget);
      expect(priceOrder(actual.items + size, size, price)).toBeGreaterThan(budget);
      if (actual.left === 1) leftovers.add('one dollar left');
      if (actual.left === price - 1) leftovers.add('one dollar short');
      if (text.includes('Ravi buys')) {
        forms.add('linked');
        const [order] = read(text, /Ravi buys (\d+) bookmarks/);
        const cost = priceOrder(order, size, price);
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Bookmarks', secondLabel: '(b) Cost in dollars' });
        expect(JSON.parse(q.answer)).toEqual([String(actual.items), String(cost)]);
      } else {
        forms.add('budget');
        expect(q.unit).toBe('bookmarks');
        expect(q.answer).toBe(String(actual.items));
      }
    }
  }
  expect(forms.size).toBe(4);
  expect(verdicts.size).toBe(4);
  expect(winners.size).toBe(2);
  expect(leftovers.size).toBe(2);
});

test('reproduces each question for the same seed and index', () => {
  for (const seed of [-7, 0, 21]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    const visible = new Set<string>();
    for (let index = 0; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      visible.add(JSON.stringify([q.context, q.prompt]));
    }
    expect(visible.size).toBeGreaterThanOrEqual(8);
  }
});
