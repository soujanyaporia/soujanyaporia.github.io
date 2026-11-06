import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragRankMonetaryAmounts';

function readPurses(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw Error('Missing purse cards');
  expect(picture.cards.map(card => card.label)).toEqual(['Purse 1', 'Purse 2', 'Purse 3']);
  return picture.cards.map(card => {
    const number = card.label.split(' ')[1];
    const pieces = card.value.split(', ').map(piece => {
      const match = /^\$(\d+) (note|coin)$/.exec(piece);
      if (!match) throw Error(`Unreadable money piece: ${piece}`);
      const value = Number(match[1]);
      expect(match[2] === 'coin' ? [1] : [2, 5, 10, 50]).toContain(value);
      return value;
    });
    const total = pieces.reduce((acc, value) => acc + value, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(100);
    return { number, pieces, total };
  });
}

function checkAnswer(q: Question, expected: string, wrong: string) {
  expect(q.answer).toBe(expected);
  expect(correctAnswer(q, expected)).toBe(true);
  expect(correctAnswer(q, wrong)).toBe(false);
}

it('solves the four response tasks using only the displayed money or price tags', () => {
  for (let seed = -2; seed <= 40; seed++) {
    const seen = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.prompt.includes('highest price')) {
        seen.add('price');
        const tags = (q.context ?? []).map(line => {
          const match = /^The ([a-z]+) costs \$(\d+)\.$/.exec(line);
          if (!match) throw Error('Missing item or price');
          return { name: match[1], price: Number(match[2]) };
        }).sort((a, b) => b.price - a.price);
        expect(tags).toHaveLength(4);
        expect(new Set(tags.map(tag => tag.name)).size).toBe(4);
        expect(new Set(tags.map(tag => tag.price)).size).toBe(4);
        expect(tags.every(tag => tag.price > 0 && tag.price <= 100)).toBe(true);
        checkAnswer(q, tags[0].name, tags[1].name);
        continue;
      }

      const purses = readPurses(q);
      expect(new Set(purses.map(purse => purse.total)).size).toBe(3);
      const ordered = [...purses].sort((a, b) => b.total - a.total);
      const most = ordered[0].number;
      const least = ordered[2].number;
      for (const [i, purse] of purses.entries()) {
        expect(q.workedSteps?.[i].equation).toMatch(new RegExp(' = \\$' + purse.total + '$'));
      }

      if (q.prompt.includes('each purse')) {
        seen.add('totals');
        expect(purses.every(p => p.pieces.length === 4 && !p.pieces.includes(1))).toBe(true);
        expect(q.structuredResponse).toEqual({
          kind: 'number-fields',
          fields: purses.map(p => ({ label: 'Dollars in purse ' + p.number })).concat({ label: 'Purse number with the most money' }),
        });
        const totals = purses.map(purse => String(purse.total));
        const expected = [...totals, most];
        checkAnswer(q, JSON.stringify(expected), JSON.stringify([...totals, least]));
        for (let i = 0; i < totals.length; i++) {
          const wrong = [...expected];
          wrong[i] = String(Number(wrong[i]) + 1);
          expect(correctAnswer(q, JSON.stringify(wrong))).toBe(false);
        }
      } else if (q.prompt.includes('most') && q.prompt.includes('least')) {
        seen.add('both');
        expect(q.structuredResponse).toEqual({
          kind: 'number-pair', firstLabel: 'Purse number with the most money', secondLabel: 'Purse number with the least money',
        });
        checkAnswer(q, JSON.stringify([most, least]), JSON.stringify([least, most]));
      } else {
        seen.add('least');
        expect(q.prompt).toContain('least');
        checkAnswer(q, least, most);
      }
    }
    expect(seen.size).toBe(4);
  }
});

it('replays a question and varies the visible givens and winning purse', () => {
  const layouts = new Set<string>();
  const winners = new Set<string>();
  let smallerPurseWins = false;
  for (let seed = 0; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      if (!q.picture) continue;
      const purses = readPurses(q);
      layouts.add(JSON.stringify(q.picture));
      const greatest = purses.reduce((a, b) => a.total > b.total ? a : b);
      winners.add(greatest.number);
      if (purses.some(p => p.pieces.length > greatest.pieces.length)) smallerPurseWins = true;
    }
  }
  expect(layouts.size).toBeGreaterThan(32);
  expect(winners.size).toBe(3);
  expect(smallerPurseWins).toBe(true);
});
