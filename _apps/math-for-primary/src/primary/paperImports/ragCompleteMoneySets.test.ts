import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCompleteMoneySets';

function readValue(label: string): number {
  const cent = /^(\d+)¢$/.exec(label);
  if (cent) return Number(cent[1]);
  const dollar = /^\$(\d+)$/.exec(label);
  if (dollar) return 100 * Number(dollar[1]);
  throw new Error(`Unreadable amount: ${label}`);
}

function readTrays(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'bars') throw new Error('Missing money trays');
  expect(picture.rows.map(row => row.label)).toEqual(q.choices);
  return picture.rows.map(row => {
    const pieces = row.parts.map(part => {
      const [label, kind] = part.label.split('\n');
      const value = readValue(label);
      expect(kind === 'coin' ? [5, 10, 20, 50, 100] : [200, 500, 1000]).toContain(value);
      expect(kind).toBe(value <= 100 ? 'coin' : 'note');
      return value;
    });
    expect(pieces.length).toBeGreaterThanOrEqual(2);
    expect(pieces.filter(v => v < 100).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
    return { choice: row.label, cents: pieces.reduce((a, b) => a + b, 0) };
  });
}

it('finds the only answer from the printed condition and all four complete sets', () => {
  const forms = new Set<string>();
  const positions = new Set<number>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const bounds = /more than (\d+)¢ but less than (\d+)¢/.exec(q.prompt);
      let matches: string[];
      if (bounds) {
        forms.add('bounds');
        const low = Number(bounds[1]);
        const high = Number(bounds[2]);
        const totals = choices.map(row => row.split(' + ').reduce((sum, coin) => {
          const cents = readValue(coin);
          expect([5, 10, 20, 50]).toContain(cents);
          return sum + cents;
        }, 0));
        expect(Math.max(...totals)).toBeLessThanOrEqual(100);
        expect(totals).toContain(low);
        expect(totals).toContain(high);
        matches = choices.filter((_, i) => low < totals[i] && totals[i] < high);
      } else {
        const trays = readTrays(q);
        const gift = /has (\$\d+)\. Her aunt gives her (\$\d+) more/.exec(q.context?.join(' ') ?? '');
        let target: number;
        if (gift) {
          forms.add('gift');
          target = readValue(gift[1]) + readValue(gift[2]);
        } else {
          const amounts = q.prompt.match(/\$\d+|\d+¢/g) ?? [];
          const [given] = amounts;
          if (amounts.length !== 1 || given === undefined) throw new Error('Expected one stated price');
          target = readValue(given);
          forms.add(q.prompt.includes('swap') ? 'exchange' : q.prompt.includes('sticker') ? 'price' : 'wallet');
        }
        matches = trays.filter(tray => tray.cents === target).map(tray => tray.choice);
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      positions.add(choices.indexOf(matches[0]));
    }
  }
  expect(forms).toEqual(new Set(['bounds', 'price', 'wallet', 'exchange', 'gift']));
  expect(positions.size).toBe(4);
});

it('reproduces a question and varies its visible givens across a session', () => {
  const sheets = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(29, index);
    expect(makeRagQuestion(29, index)).toEqual(q);
    sheets.add(JSON.stringify([q.prompt, q.context, q.picture, q.choices]));
  }
  expect(sheets.size).toBeGreaterThanOrEqual(8);
});
