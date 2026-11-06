import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragCashCollections';

function readGroup(label: string) {
  const match = /^(\d+) (\$\d+|\d+¢) (coins|notes)$/.exec(label);
  if (!match) throw new Error(`Unreadable coin or note group: ${label}`);
  const count = Number(match[1]);
  const token = match[2];
  const face = token.startsWith('$') ? 100 * Number(token.slice(1)) : Number(token.slice(0, -1));
  expect(match[3] === 'notes' ? [200, 500] : [5, 10, 20, 50, 100]).toContain(face);
  expect(count).toBeGreaterThan(0);
  // Count the individual coins or notes instead of using the generator's subtotal.
  const cents = Array.from({ length: count }, () => face).reduce((sum, value) => sum + value, 0);
  return { label, face, cents };
}

function readGroups(sentence: string) {
  const labels = sentence.match(/\d+ (?:\$\d+|\d+¢) (?:notes|coins)\b/g) ?? [];
  return labels.map(readGroup);
}

function readMoney(text: string) {
  const match = /^\$(\d+)\.(\d{2})$/.exec(text);
  if (!match) throw new Error(`Unreadable price or balance: ${text}`);
  return 100 * Number(match[1]) + Number(match[2]);
}

it('solves each question from the choices, prices and amounts shown to the pupil', () => {
  const winningFaces = new Set<number>();
  const winningPositions = new Set<number>();
  const affordableCases = new Set<string>();
  const balances = new Set<number>();
  for (let seed = -8; seed < 72; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.choices) {
        expect(q.prompt).toMatch(/worth the most/i);
        const piles = q.choices.map(readGroup);
        expect(piles).toHaveLength(4);
        expect(piles.map(p => p.face).sort((a, b) => a - b)).toEqual([10, 20, 50, 100]);
        expect(new Set(piles.map(p => p.cents)).size).toBe(4);
        const winners = piles.filter(p => piles.every(other => p.cents >= other.cents));
        expect(winners).toHaveLength(1);
        expect(q.answer).toBe(winners[0].label);
        winningFaces.add(winners[0].face);
        winningPositions.add(q.choices.indexOf(winners[0].label));
      } else if (q.prompt.includes('buy')) {
        const [wallet, ...priceLines] = q.context ?? [];
        const cash = readGroups(wallet);
        expect(cash).toHaveLength(2);
        expect(wallet).toMatch(/notes and .* coins/);
        const budget = cash.reduce((sum, g) => sum + g.cents, 0);
        expect(priceLines).toHaveLength(3);
        const offers = priceLines.map(line => {
          const [name, price] = line.split(' — ');
          return { name, cents: readMoney(price) };
        });
        const affordable = offers.filter(item => item.cents <= budget);
        expect(affordable).toHaveLength(1);
        expect(q.answer).toBe(affordable[0].name);
        affordableCases.add(affordable[0].cents === budget ? 'exact' : 'below');
      } else {
        expect(q.prompt).toMatch(/jar now/i);
        const [start, deposit] = q.context ?? [];
        const amount = /\$\d+\.\d{2}/.exec(start);
        if (!amount) throw new Error('Missing opening balance');
        const groups = readGroups(deposit);
        expect(groups).toHaveLength(3);
        expect(new Set(groups.map(g => g.face)).size).toBe(3);
        const total = groups.reduce((sum, g) => sum + g.cents, readMoney(amount[0]));
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(`${Math.floor(total / 100)}.${String(total % 100).padStart(2, '0')}`);
        balances.add(total);
      }
    }
  }
  expect(winningFaces.size).toBe(4);
  expect(winningPositions.size).toBe(4);
  expect(affordableCases).toEqual(new Set(['exact', 'below']));
  expect(balances.size).toBeGreaterThan(8);
});

it('reproduces a question from its seed and index and varies visible givens within a session', () => {
  const visible = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(407, index);
    expect(makeRagQuestion(407, index)).toEqual(q);
    visible.add(JSON.stringify([q.prompt, q.context, q.choices]));
  }
  expect(makeRagQuestion(407)).toEqual(makeRagQuestion(407, 0));
  expect(visible.size).toBeGreaterThan(8);
});
