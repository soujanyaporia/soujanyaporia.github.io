import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragReadAndTotalPicturedMoney';

// Recover the rows from the text actually drawn at each height, in reading order.
function readRows(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw new Error('Missing money picture');
  const text = picture.marks.filter(mark => mark.kind === 'text');
  const heights = [...new Set(text.map(mark => mark.y))].sort((a, b) => a - b);
  const rows = heights.map(y => {
    const [label, ...pieces] = text.filter(mark => mark.y === y).sort((a, b) => a.x - b.x);
    expect(pieces.length).toBeGreaterThan(0);
    return { name: label.text, pieces: pieces.map(mark => mark.text) };
  });
  const faces = rows.flatMap(row => row.pieces);
  const coins = faces.filter(face => face.endsWith('¢') || face === '$1');
  expect(picture.marks.filter(mark => mark.kind === 'circle')).toHaveLength(coins.length);
  expect(picture.marks.filter(mark => mark.kind === 'path')).toHaveLength(faces.length - coins.length);
  return rows;
}

function dollarValue(face: string) {
  expect(face).toMatch(/^\$(1|2|5|10|50)$/);
  return Number(face.slice(1));
}

function centValue(face: string) {
  if (face === '$1') return 100;
  expect(face).toMatch(/^(5|10|20|50)¢$/);
  return Number(face.slice(0, -1));
}

it('solves all three tasks from the drawn denominations and the purchase clues', () => {
  const targets = new Set<number>();
  const winningRows = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    const kinds: string[] = [];
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = readRows(q);
      if (q.choices) {
        kinds.push('coin');
        const [reference, ...options] = rows;
        expect(reference.pieces).toHaveLength(1);
        expect(options).toHaveLength(4);
        expect(q.choices).toEqual(options.map(row => row.name));
        const target = centValue(reference.pieces[0]);
        targets.add(target);
        const matches = options.filter(row => {
          const total = row.pieces.reduce((n, face) => n + centValue(face), 0);
          expect(total).toBeLessThanOrEqual(100);
          return total === target;
        });
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(matches[0].name);
        winningRows.add(matches[0].name);
      } else if (rows[0].name === 'Wallet') {
        kinds.push('payment');
        const givens = q.context?.join(' ') ?? '';
        const priceMatch = /costs \$(\d+)/.exec(givens);
        const countMatch = /exactly (\d+) notes/.exec(givens);
        if (!priceMatch || !countMatch) throw new Error('The price and note count must be visible');
        const price = Number(priceMatch[1]);
        const count = Number(countMatch[1]);
        const notes = rows.flatMap(row => row.pieces.map(dollarValue));
        expect(count).toBe(4);
        expect(notes.length).toBeGreaterThan(count);
        const possible = new Set<number>();
        for (let mask = 0; mask < 2 ** notes.length; mask++) {
          const chosen = notes.filter((_, i) => (mask & (1 << i)) !== 0);
          if (chosen.length !== count) continue;
          const value = chosen.reduce((a, b) => a + b, 0);
          if (value >= price) possible.add(value);
        }
        expect(possible.size).toBe(1);
        const [paid] = possible;
        expect(paid).toBeGreaterThan(price);
        expect(paid).toBeLessThanOrEqual(100);
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(String(paid));
      } else {
        kinds.push('savings');
        expect(rows.map(row => row.name)).toEqual(['Friday', 'Saturday']);
        const daily = rows.map(row => row.pieces.reduce((n, face) => n + dollarValue(face), 0));
        const total = daily[0] + daily[1];
        expect(total).toBeLessThanOrEqual(100);
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(String(total));
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          ...rows.map((row, i) => `${row.pieces.join(' + ')} = $${daily[i]}`),
          `$${daily[0]} + $${daily[1]} = $${total}`,
        ]);
      }
    }
    expect(kinds.sort()).toEqual(['coin', 'payment', 'savings']);
  }
  expect([...targets].sort((a, b) => a - b)).toEqual([50, 100]);
  expect(winningRows.size).toBe(4);
});

it('reproduces the question for the same seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  for (const index of [-1, 1, 8]) {
    expect(makeRagQuestion(-7, index)).toEqual(makeRagQuestion(-7, index));
  }
});
