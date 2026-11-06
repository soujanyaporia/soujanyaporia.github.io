import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4WholePackBounds';
import type { Question } from '../generate';

function read(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern} in ${text}`);
  return match.slice(1).map(Number);
}

// Buy one pack at a time using only the amounts shown to the pupil.
function shop(wallet: number, price: number, size: number) {
  expect(Number.isInteger(wallet) && wallet > 0 && wallet <= 9999).toBe(true);
  expect(Number.isInteger(price) && price > 0 && price <= 9).toBe(true);
  expect(Number.isInteger(size) && size > 0 && size <= 9).toBe(true);
  let items = 0;
  while (wallet >= price) { wallet -= price; items += size; }
  return { items, left: wallet };
}

function solve(q: Question) {
  const text = (q.context ?? []).join(' ');
  if (q.prompt.includes('greatest number of bookmarks')) {
    expect(text).toContain('only in packs');
    const matched = text.startsWith('Last week');
    const [size, price] = read(text, /only in packs of (\d+)(?: for \$|\. A pack costs \$)(\d+)/);
    let wallet: number;
    if (matched) {
      const [oldSize, cost, bought] = read(text, /a pack of (\d+) bookmarks cost \$(\d+)\. Hana bought (\d+) bookmarks/);
      expect(text).toContain('the same amount to spend as she paid last week');
      expect(bought % oldSize).toBe(0);
      wallet = (bought / oldSize) * cost;
    } else {
      [wallet] = read(text, /Hana has \$(\d+) to spend/);
    }
    const { items, left } = shop(wallet, price, size);
    expect(left).toBeGreaterThan(0);
    expect(items).toBeGreaterThan(0);
    return { mode: matched ? 'matched' : 'budget', answer: items, unit: 'bookmarks' };
  }
  if (q.prompt.includes('least amount')) {
    const [size, price] = read(text, /only in packs of (\d+)\. One pack costs \$(\d+)/);
    const [target] = read(text, /at least (\d+) hats/);
    expect(size).toBeGreaterThan(1);
    expect(price).toBeGreaterThan(0);
    expect(target % size).not.toBe(0);
    let hats = 0, paid = 0;
    while (hats < target) { hats += size; paid += price; }
    expect(hats - size).toBeLessThan(target);
    expect(hats).toBeGreaterThan(target);
    return { mode: 'target', answer: paid, unit: 'dollars' };
  }
  expect(q.prompt).toBe('How many badges did Siti buy?');
  expect(text).toContain('same amount on badges as on cards');
  const [total] = read(text, /spent \$(\d+) altogether/);
  const table = q.picture;
  if (table?.type !== 'nanyang-p4' || table.layout !== 'table') throw new Error('Missing price table');
  const sizeCol = table.columns.indexOf('Items per pack');
  const priceCol = table.columns.indexOf('Price per pack ($)');
  expect(total % 2).toBe(0);
  const goods = ['Badges', 'Cards'].map(name => {
    const row = table.rows.find(row => row.label === name);
    const size = row?.values[sizeCol], price = row?.values[priceCol];
    if (typeof price !== 'number' || typeof size !== 'number') throw new Error(`Incomplete ${name} row`);
    const purchase = shop(total / 2, price, size);
    expect(purchase.left).toBe(0);
    return purchase.items;
  });
  return { mode: 'equal', answer: goods[0], unit: 'badges' };
}

it('solves each visible shopping problem and checks the requested unit across seeds and indices', () => {
  const examples = new Map<string, Set<string>>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { mode, answer, unit } = solve(q);
      expect(q.answer).toBe(String(answer));
      expect(q.unit).toBe(unit);
      expect(q.choices).toBeUndefined();
      const seen = examples.get(mode) ?? new Set<string>();
      seen.add(JSON.stringify([q.context, q.picture]));
      examples.set(mode, seen);
    }
  }
  expect([...examples.keys()].sort()).toEqual(['budget', 'equal', 'matched', 'target']);
  for (const seen of examples.values()) expect(seen.size).toBeGreaterThan(8);
});

it('reproduces a question for the same seed and index', () => {
  for (let index = 0; index < 4; index++) {
    expect(makeRagQuestion(81, index)).toEqual(makeRagQuestion(81, index));
  }
});
