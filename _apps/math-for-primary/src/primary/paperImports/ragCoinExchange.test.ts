import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCoinExchange';

function tileCents(tile: string): number {
  const dollar = /^\$(\d+)$/.exec(tile);
  if (dollar) return Number(dollar[1]) * 100;
  const cent = /^(\d+)¢$/.exec(tile);
  if (cent) return Number(cent[1]);
  throw new Error(`Unreadable money tile: ${tile}`);
}

function readExchange(q: Question) {
  const text = q.context?.join(' ') ?? '';
  const coin = /Every coin Siti receives is worth (\d+) cents\./.exec(text);
  if (!coin) throw new Error('Missing target coin value');
  const target = Number(coin[1]);
  expect([10, 20, 50]).toContain(target);
  expect(q.prompt).toBe('How many coins does Siti receive?');

  if (q.picture) {
    if (q.picture.type !== 'pattern') throw new Error('Expected labelled money tiles');
    const tiles = q.picture.items;
    expect(tiles.some(t => /^\$[25]$/.test(t))).toBe(true);
    expect(tiles).toContain('$1');
    expect(tiles).toContain('50¢');
    return { form: 'pictured', target, cents: tiles.reduce((sum, tile) => sum + tileCents(tile), 0) };
  }
  const amount = /takes \$(\d+) to the change counter/.exec(text);
  if (amount) return { form: 'stated', target, cents: Number(amount[1]) * 100 };

  const given = /swaps (\d+) notes worth \$(\d+) each/.exec(text);
  const returned = /receives (\d+) notes worth \$(\d+) each and the rest in coins/.exec(text);
  if (!given || !returned) throw new Error('Missing one side of the note exchange');
  const handedOver = Number(given[1]) * Number(given[2]);
  const receivedInNotes = Number(returned[1]) * Number(returned[2]);
  expect(receivedInNotes).toBeGreaterThan(0);
  expect(receivedInNotes).toBeLessThan(handedOver);
  return { form: 'mixed', target, cents: 100 * (handedOver - receivedInNotes) };
}

it('reconstructs the coin count from the visible money for all three exchange forms', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, target, cents } = readExchange(q);
      forms.add(form);
      expect(cents).toBeGreaterThan(0);
      expect(cents).toBeLessThanOrEqual(1300);
      let coins = 0;
      let remaining = cents;
      while (remaining >= target) {
        remaining -= target;
        coins++;
      }
      expect(remaining).toBe(0);
      expect(q.answer).toBe(String(coins));
      expect(q.unit).toBe('coins');
      if (form === 'mixed') {
        expect(q.choices).toBeUndefined();
      } else {
        const choices = q.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices.every(c => /^[1-9]\d*$/.test(c))).toBe(true);
        expect(choices).toContain(String(coins));
      }
    }
  }
  expect([...forms].sort()).toEqual(['mixed', 'pictured', 'stated']);
});

it('repeats the same question for a seed and index and varies the visible givens across indices', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture]));
  }
  expect(givens.size).toBeGreaterThan(3);
});
