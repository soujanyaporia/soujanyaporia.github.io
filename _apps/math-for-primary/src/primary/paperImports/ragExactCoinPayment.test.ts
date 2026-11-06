import { expect, test } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragExactCoinPayment';

// Build an answer from the displayed coins and the wording a pupil sees.
// Each bit chooses one physical coin, including when several labels are alike.
function solve(seed: number, index: number) {
  const q = makeRagQuestion(seed, index);
  if (q.picture?.type !== 'pattern' || q.structuredResponse?.kind !== 'number-fields') throw new Error('Missing tray or coin fields');
  const coins = q.picture.items.map(label => {
    const match = /^(5|10|20|50)¢$/.exec(label);
    if (!match) throw new Error(`Unreadable coin ${label}`);
    return Number(match[1]);
  });
  const fields = q.structuredResponse.fields.map(field => Number(/^(\d+)¢ coins$/.exec(field.label)?.[1]));
  expect([...fields].sort((a, b) => a - b)).toEqual([5, 10, 20, 50]);
  const context = q.context ?? [];
  const machineRule = context.find(line => line.startsWith('The machine takes only '));
  const allowed = machineRule ? Array.from(machineRule.matchAll(/(\d+)¢/g), m => Number(m[1])) : [...new Set(coins)];
  const count = /exactly (\d+) coins/.exec(q.prompt);
  const purchase = /buys one (\w+) and one (\w+)/.exec(q.prompt);
  let target: number;
  let mode: string;
  if (purchase) {
    mode = 'shop';
    const prices = new Map<string, number>();
    for (const line of context) {
      const price = /^A (\w+) costs (\d+)¢\.$/.exec(line);
      if (price) prices.set(price[1], Number(price[2]));
    }
    expect(prices.size).toBe(4);
    expect(purchase[1]).not.toBe(purchase[2]);
    target = Number(prices.get(purchase[1])) + Number(prices.get(purchase[2]));
  } else if (machineRule) {
    mode = 'machine';
    expect(allowed).toEqual([10, 20, 50]);
    const price = /costs \$(\d+)\.(\d{2})\./.exec(q.prompt);
    if (!price) throw new Error('Missing price in dollars');
    target = 100 * Number(price[1]) + Number(price[2]);
  } else {
    mode = count ? 'count' : 'tray';
    const price = /make (\d+)¢/.exec(q.prompt);
    if (!price) throw new Error('Missing target in cents');
    target = Number(price[1]);
  }

  const solutions = new Set<string>();
  const wrongRule = new Set<string>();
  for (let mask = 1; mask < 2 ** coins.length; mask++) {
    const taken = coins.filter((_, i) => Boolean(mask & (1 << i)));
    if (taken.reduce((sum, v) => sum + v, 0) !== target) continue;
    const response = JSON.stringify(fields.map(v => String(taken.filter(coin => coin === v).length)));
    const legal = taken.every(v => allowed.includes(v)) && (!count || taken.length === Number(count[1]));
    (legal ? solutions : wrongRule).add(response);
  }
  expect(solutions.size).toBe(1);
  const [answer] = solutions;
  expect(q.answer).toBe(answer);
  expect(structuredResponseCorrect(q.structuredResponse, q.answer, answer)).toBe(true);
  if (machineRule || count) expect(wrongRule.size).toBeGreaterThan(0);
  for (const invalid of wrongRule) expect(structuredResponseCorrect(q.structuredResponse, q.answer, invalid)).toBe(false);
  return { mode, target };
}

test('visible trays have one payable selection by denomination across all prompt forms', () => {
  const targets = new Map<string, Set<number>>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 3; index++) {
      const { mode, target } = solve(seed, index);
      const seen = targets.get(mode) ?? new Set<number>();
      seen.add(target);
      targets.set(mode, seen);
    }
  }
  expect([...targets.keys()].sort()).toEqual(['count', 'machine', 'shop', 'tray']);
  for (const seen of targets.values()) expect(seen.size).toBeGreaterThan(1);
});

test('a seed and index reproduce the tray, prices and worked payment', () => {
  for (const seed of [-9, 0, 27]) {
    const session = Array.from({ length: 12 }, (_, index) => makeRagQuestion(seed, index));
    expect(session).toEqual(Array.from({ length: 12 }, (_, index) => makeRagQuestion(seed, index)));
    expect(new Set(session.map(q => JSON.stringify([q.prompt, q.picture, q.context]))).size).toBeGreaterThan(1);
  }
});
