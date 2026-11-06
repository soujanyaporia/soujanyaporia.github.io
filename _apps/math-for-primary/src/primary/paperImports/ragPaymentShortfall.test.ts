import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragPaymentShortfall';

function dollarAmounts(text: string): number[] {
  return Array.from(text.matchAll(/\$(\d+)/g), match => Number(match[1]));
}

function tokenInCents(label: string): number {
  const note = /^\$(2|5|10|50)$/.exec(label);
  if (note) return Number(note[1]) * 100;
  const coin = /^(5|10|20|50)¢$/.exec(label);
  if (coin) return Number(coin[1]);
  throw new Error(`Unreadable money label ${label}`);
}

function bundleInDollars(label: string): number {
  const match = /^(\d+) \$(2|5|10|50) notes?$/.exec(label);
  if (!match || Number(match[1]) < 1) throw new Error(`Invalid group of notes: ${label}`);
  return Number(match[1]) * Number(match[2]);
}

test('solves each response from the displayed prices, money labels and savings clues', () => {
  const seen = new Set<string>();
  let comparedAnExactPayment = false;
  for (let seed = -4; seed < 68; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const [priceLine, , clue] = q.context ?? [];
      const prices = dollarAmounts(priceLine);
      const cost = prices.reduce((total, price) => total + price, 0);
      expect(prices.every(price => price > 0)).toBe(true);
      expect(cost).toBeLessThan(1000);
      if (q.picture) {
        if (q.picture.type !== 'pattern') throw new Error('Expected individual money labels');
        expect(prices).toHaveLength(1);
        const labels = q.picture.items;
        const held = labels.reduce((cents, label) => cents + tokenInCents(label), 0);
        const needed = 100 * cost - held;
        expect(held).toBeGreaterThan(0);
        expect(needed).toBeGreaterThan(0);
        if (labels.some(label => label.endsWith('¢'))) {
          expect(labels.some(label => label.startsWith('$'))).toBe(true);
          expect(needed % 100).toBeGreaterThan(0);
          expect(q.choices).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(q.answer).toBe((needed / 100).toFixed(2));
          seen.add('notes and coins');
        } else {
          const expected = `$${needed / 100}`;
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(expected);
          expect(q.answer).toBe(expected);
          seen.add('notes only');
        }
      } else if (q.choices) {
        expect(prices).toHaveLength(2);
        expect(q.choices).toHaveLength(4);
        const below = q.choices.filter(label => bundleInDollars(label) < cost);
        expect(below).toHaveLength(1);
        expect(q.answer).toBe(below[0]);
        comparedAnExactPayment ||= q.choices.some(label => bundleInDollars(label) === cost);
        seen.add('insufficient bundle');
      } else {
        expect(prices).toHaveLength(3);
        const amounts = dollarAmounts(clue);
        expect(amounts).toHaveLength(1);
        const known = amounts[0];
        expect(known).toBeGreaterThan(0);
        expect(known).toBeLessThan(cost);
        if (clue.includes('still needs')) {
          expect(q.prompt).toContain('already saved');
          seen.add('recover savings');
        } else {
          expect(clue).toContain('has saved');
          expect(q.prompt).toContain('more');
          seen.add('find shortfall');
        }
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(String(cost - known));
      }
    }
  }
  expect(seen).toEqual(new Set(['notes and coins', 'notes only', 'insufficient bundle', 'recover savings', 'find shortfall']));
  expect(comparedAnExactPayment).toBe(true);
});

test('replays the same question and varies the visible givens across indices', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(19, index);
    expect(makeRagQuestion(19, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture, q.choices]));
  }
  expect(givens.size).toBeGreaterThan(8);
});
