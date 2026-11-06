import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragAffordablePurchases';

function cents(tag: string): number {
  const dollars = /^\$(\d+)$/.exec(tag);
  if (dollars) return 100 * Number(dollars[1]);
  const coins = /^(\d+)¢$/.exec(tag);
  if (coins) return Number(coins[1]);
  throw new Error(`Unreadable price: ${tag}`);
}

function readShelf(q: Question) {
  const [budgetLine, ...lines] = q.context ?? [];
  const purse = /^Nora has (\$\d+|\d+¢) to spend at the school fair\.$/.exec(budgetLine ?? '');
  if (!purse) throw new Error('Missing visible budget');
  const items = lines.map(line => {
    const label = /^(.+) — (\$\d+|\d+¢)$/.exec(line);
    if (!label) throw new Error(`Unreadable shelf label: ${line}`);
    return { name: label[1], cost: cents(label[2]) };
  });
  expect(new Set(items.map(item => item.name)).size).toBe(items.length);
  return { budget: cents(purse[1]), items };
}

it('accepts exactly the affordable pair in either order, including when money is left over', () => {
  const observed = new Set<string>();
  for (let seed = 0; seed < 120; seed++) {
    for (const index of [0, 1, 3]) {
      const q = makeRagQuestion(seed, index);
      if (!q.prompt.includes('two different items')) continue;
      const { budget, items } = readShelf(q);
      expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: items.map(item => item.name) });
      const solutions: string[][] = [];
      for (const [i, first] of items.entries()) {
        expect(correctAnswer(q, JSON.stringify([first.name, first.name]))).toBe(false);
        for (const other of items.slice(i + 1)) {
          const pair = [first.name, other.name];
          const total = first.cost + other.cost;
          const affordable = total <= budget;
          if (affordable) {
            solutions.push([...pair].sort());
            observed.add(total === budget ? 'exact' : 'below');
          }
          expect(correctAnswer(q, JSON.stringify(pair))).toBe(affordable);
          expect(correctAnswer(q, JSON.stringify([other.name, first.name]))).toBe(affordable);
        }
      }
      expect(solutions).toHaveLength(1);
      expect(JSON.parse(q.answer).sort()).toEqual(solutions[0]);
      observed.add(budget > 100 ? 'whole dollars' : 'cents');
      if (budget === 100 && q.context?.[0].includes('$1 ')) observed.add('one-dollar budget');
    }
  }
  expect([...observed].sort()).toEqual(['below', 'cents', 'exact', 'one-dollar budget', 'whole dollars']);
});

it('finds the only affordable item from its tag and grades the change in cents', () => {
  const changes = new Set<number>();
  for (let seed = 0; seed < 180; seed++) {
    const q = makeRagQuestion(seed, seed % 4);
    if (!q.prompt.includes('change')) continue;
    const { budget, items } = readShelf(q);
    const possible = items.filter(item => item.cost <= budget);
    expect(possible).toHaveLength(1);
    const change = budget - possible[0].cost;
    changes.add(change);
    const choices = q.choices ?? [];
    expect(new Set(choices).size).toBe(4);
    expect(choices).toHaveLength(4);
    expect(choices.filter(label => cents(label) === change)).toEqual([`${change}¢`]);
    expect(q.answer).toBe(`${change}¢`);
    for (const choice of choices) expect(correctAnswer(q, choice)).toBe(cents(choice) === change);
  }
  expect(changes.size).toBeGreaterThan(1);
});

it('replays a seed and index and varies visible givens across a session', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
