import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCountedCash';

function readDollars(label: string): number {
  const m = /^\$(\d+)\.(\d{2})$/.exec(label);
  if (!m) throw new Error(`Expected a dollar amount, got ${label}`);
  return Number(m[1]) * 100 + Number(m[2]);
}

// Read only what a pupil sees. Return the two known amounts in the relationship
// candidate + known part = whole, without using the generator's calculations.
function readTransaction(q: Pick<Question, 'prompt' | 'context' | 'picture'>) {
  const text = (q.context ?? []).join(' ');
  if (q.picture?.type === 'pattern') {
    expect(q.prompt).toMatch(/price of the pear/);
    const count = /all (\d+) coins/.exec(text);
    const change = /(\d+)¢ back/.exec(text);
    if (!count || !change) throw new Error('Missing payment count or change');
    expect(q.picture.items).toHaveLength(Number(count[1]));
    expect(new Set(q.picture.items).size).toBe(2);
    let paid = 0;
    for (const tile of q.picture.items) {
      expect(tile).toMatch(/^(10|20|50)¢$/);
      paid += Number(tile.slice(0, -1));
    }
    return { role: 'payment', whole: paid, known: Number(change[1]) };
  }
  expect(q.picture).toBeUndefined();
  const faces: Record<string, number> = { ten: 10, twenty: 20, fifty: 50 };
  const groups = [...text.matchAll(/(\d+) (ten|twenty|fifty)-cent coins/g)];
  const coins = groups.flatMap(([, count, face]) => Array<number>(Number(count)).fill(faces[face]));
  const counted = coins.reduce((sum, value) => sum + value, 0);
  const expense = /spends (\$\d+\.\d{2})/.exec(text);
  if (expense) {
    expect(q.prompt).toMatch(/left in Siti’s purse/);
    expect(groups).toHaveLength(2);
    const price = readDollars(expense[1]);
    // Check that some subset of the actual purse coins can pay this price.
    const payable = new Set([0]);
    for (const coin of coins) for (const sum of [...payable]) payable.add(sum + coin);
    expect(payable.has(price)).toBe(true);
    return { role: 'starting cash', whole: counted, known: price };
  }
  const start = /has (\$\d+\.\d{2}) in his wallet/.exec(text);
  if (!start || !text.includes('pay the exact price')) throw new Error('Missing wallet or payment information');
  expect(q.prompt).toMatch(/left in Irfan’s wallet/);
  expect(groups).toHaveLength(3);
  return { role: 'expense', whole: readDollars(start[1]), known: counted };
}

test('exactly one displayed choice completes each transaction', () => {
  const outcomes = new Map<string, Set<number>>();
  for (let seed = -12; seed < 48; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { role, whole, known } = readTransaction(q);
      expect(known).toBeGreaterThan(0);
      expect(known).toBeLessThan(whole);
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      const values = choices.map(readDollars);
      expect(new Set(values).size).toBe(4);
      expect(Math.min(...values)).toBeGreaterThan(0);
      const solutions = choices.filter((_, i) => values[i] + known === whole);
      expect(solutions).toHaveLength(1);
      expect(q.answer).toBe(solutions[0]);
      if (!outcomes.has(role)) outcomes.set(role, new Set<number>());
      outcomes.get(role)!.add(readDollars(solutions[0]));
    }
  }
  expect([...outcomes.keys()].sort()).toEqual(['expense', 'payment', 'starting cash']);
  for (const values of outcomes.values()) expect(values.size).toBeGreaterThan(4);
});

test('a seed and index reproduce the visible coins, amounts and choice order', () => {
  for (const index of [0, 1, 2]) expect(makeRagQuestion(41, index)).toEqual(makeRagQuestion(41, index));
});
