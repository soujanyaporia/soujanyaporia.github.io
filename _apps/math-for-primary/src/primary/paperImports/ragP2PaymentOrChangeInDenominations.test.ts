import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragP2PaymentOrChangeInDenominations';

test('solves both kinds of purchase using only the displayed price and denominations', () => {
  const coinPayments = new Set<number>();
  const dollarPayments = new Set<number>();

  for (let seed = -4; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      if (q.picture?.type === 'pattern') {
        const priceMatch = /for \$(\d+)\./.exec(text);
        if (!priceMatch) throw new Error('Missing dollar price');
        const price = Number(priceMatch[1]);
        const pieces = q.picture.items.map(label => {
          if (!/^\$(1|2|5|10|50)$/.test(label)) throw new Error(`Unexpected cash label: ${label}`);
          return Number(label.slice(1));
        });
        expect(pieces).toContain(1);
        expect(new Set(pieces).size).toBeLessThan(pieces.length);
        const change = pieces.reduce((sum, value) => sum + value, 0);
        const payment = price + change;
        expect(price).toBeGreaterThan(0);
        expect(payment).toBeLessThanOrEqual(100);
        expect(q.unit).toBe('dollars');
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(String(payment));
        expect(q.workedSteps?.at(-1)?.equation).toBe(`$${price} + $${change} = $${payment}`);
        dollarPayments.add(payment);
      } else {
        const priceMatch = /for (\d+)¢\./.exec(text);
        const coins = /one (\d+)-cent coin and (\d+) (\d+)-cent coins/.exec(text);
        if (!priceMatch || !coins) throw new Error('Missing cent price or counted coins');
        const [single, count, small] = coins.slice(1).map(Number);
        expect([5, 10, 20, 50]).toContain(single);
        expect([5, 10, 20, 50]).toContain(small);
        expect(single).toBeGreaterThan(small);
        expect(count).toBeGreaterThan(1);
        let payment = single;
        for (let coin = 0; coin < count; coin++) payment += small;
        const price = Number(priceMatch[1]);
        expect(price).toBeGreaterThan(0);
        expect(price).toBeLessThan(payment);
        expect(payment).toBeLessThanOrEqual(100);
        const expected = `${payment - price}¢`;
        const options = q.choices ?? [];
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.every(option => /^[1-9]\d*¢$/.test(option))).toBe(true);
        expect(options.filter(option => option === expected)).toHaveLength(1);
        expect(q.answer).toBe(expected);
        expect(q.workedSteps?.at(-1)?.equation).toBe(`${payment}¢ − ${price}¢ = ${expected}`);
        coinPayments.add(payment);
      }
    }
  }
  expect(coinPayments.size).toBeGreaterThan(1);
  expect(dollarPayments.size).toBeGreaterThan(1);
});

test('replays a seeded question and gives both response forms on consecutive indices', () => {
  for (const seed of [-7, 0, 13, 108]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const second = makeRagQuestion(seed, 1);
    expect(second.key).not.toBe(first.key);
    expect([first, second].filter(q => q.choices !== undefined)).toHaveLength(1);
    expect([first, second].filter(q => q.picture?.type === 'pattern')).toHaveLength(1);
  }
});
