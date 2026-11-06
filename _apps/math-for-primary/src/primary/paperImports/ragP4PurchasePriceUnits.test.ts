import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4PurchasePriceUnits';

function solvePrintedBill(q: Question) {
  const [comparison, receipt] = q.context ?? [];
  const relation = /^Each large (tent|badge) costs the same as (\d+) small (\w+)\.$/.exec(comparison ?? '');
  const bill = /^The club paid \$(\d+)\.(\d{2}) for (\d+) large (\w+) and (\d+) small (\w+)\.$/.exec(receipt ?? '');
  if (!relation || !bill) throw new Error('The pupil needs a price comparison and a complete bill.');
  const item = relation[1];
  const factor = Number(relation[2]);
  const total = 100 * Number(bill[1]) + Number(bill[2]);
  const largeCount = Number(bill[3]);
  const smallCount = Number(bill[5]);
  expect(relation[3]).toBe(`${item}s`);
  expect(bill[4]).toBe(largeCount === 1 ? item : `${item}s`);
  expect(bill[6]).toBe(`${item}s`);
  expect(factor).toBeGreaterThan(1);
  expect(Math.min(largeCount, smallCount)).toBeGreaterThan(0);

  // Price the basket forwards in cents, using only the quantities and comparison on screen.
  const units = largeCount * factor + smallCount;
  const small = Math.floor(total / units);
  const large = factor * small;
  expect(small).toBeGreaterThan(0);
  expect(largeCount * large + smallCount * small).toBe(total);
  const amounts = new Map<string, number>([
    [`What is the price of one small ${item}?`, small],
    [`What is the price of one large ${item}?`, large],
    [`How much would one large ${item} and one small ${item} cost together?`, small + large],
    [`How much more does one large ${item} cost than one small ${item}?`, large - small],
  ]);
  const expected = amounts.get(q.prompt);
  if (expected === undefined) throw new Error(`Unrecognised price request: ${q.prompt}`);
  if (q.prompt.startsWith('How much more')) {
    expect(largeCount).toBe(smallCount);
    expect(largeCount).toBeGreaterThan(1);
    expect(largeCount).toBeLessThanOrEqual(9);
    expect(factor + 1).toBeLessThanOrEqual(9);
  } else {
    expect(largeCount).not.toBe(smallCount);
    expect(units).toBeLessThanOrEqual(9);
  }
  return { expected, item, small };
}

it('answers each printed request exactly in dollars across seeds and indices', () => {
  const requests = new Set<string>();
  const priceForms = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { expected, item, small } = solvePrintedBill(q);
      expect(q.answer).toBe((expected / 100).toFixed(2));
      expect(q.unit).toBe('dollars');
      expect(q.choices).toBeUndefined();
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      requests.add(q.prompt.replaceAll(item, 'item'));
      priceForms.add(small % 100 === 0 ? 'whole dollars' : 'dollars and cents');
    }
  }
  expect(requests.size).toBe(4);
  expect(priceForms.size).toBe(2);
});

it('reproduces a question and varies the visible bills within a session', () => {
  const bills = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    bills.add(JSON.stringify(q.context));
  }
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(bills.size).toBeGreaterThan(8);
});
