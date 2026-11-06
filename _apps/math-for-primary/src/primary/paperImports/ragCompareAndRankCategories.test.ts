import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragCompareAndRankCategories';

function readGraph(q: Question) {
  const p = q.picture;
  if (p?.type !== 'bars' || !p.pictures || p.scale !== 1) throw Error('Expected a one-dot-per-item graph');
  expect(p.labels.length).toBe(p.values.length);
  expect(new Set(p.labels).size).toBe(p.labels.length);
  for (const n of p.values) {
    expect(Number.isInteger(n) && n >= 1 && n <= 10).toBe(true);
  }
  return new Map(p.labels.map((label, i) => [label, p.values[i]] as const));
}

function lookup(rows: Map<string, number>, name: string) {
  const count = rows.get(name);
  if (count === undefined) throw Error(`Missing row for ${name}`);
  return count;
}

it('solves each prompt using its named rows and its visible key', () => {
  const words = new Set<string>();
  const rankPositions = new Set<string>();
  for (let seed = -12; seed < 48; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = readGraph(q);
      const comparison = /([A-Za-z]+) has (\d+) ___ stickers? than ([A-Za-z]+)\.$/.exec(q.prompt);
      const extreme = /^Does ([A-Za-z]+) have the most stickers or the fewest stickers\?$/.exec(q.prompt);
      let expected: string;
      let wrong: string;
      if (comparison) {
        const [, first, givenGap, second] = comparison;
        expect(rows.size).toBe(4);
        expect(q.context?.join(' ')).toContain('1 sticker');
        const diff = lookup(rows, first) - lookup(rows, second);
        expect(diff).not.toBe(0);
        expect(Math.abs(diff)).toBe(Number(givenGap));
        expected = diff > 0 ? 'more' : 'fewer';
        wrong = diff > 0 ? 'fewer' : 'more';
        expect(q.choices?.slice().sort()).toEqual(['fewer', 'more']);
        words.add(expected);
      } else if (extreme) {
        expect(rows.size).toBe(4);
        expect(q.context?.join(' ')).toContain('1 sticker');
        const count = lookup(rows, extreme[1]);
        const rest = [...rows].filter(([name]) => name !== extreme[1]);
        const above = rest.every(([, n]) => count > n);
        const below = rest.every(([, n]) => count < n);
        expect(above || below).toBe(true);
        expected = above ? 'most' : 'fewest';
        wrong = above ? 'fewest' : 'most';
        expect(q.choices?.slice().sort()).toEqual(['fewest', 'most']);
        words.add(expected);
      } else {
        const match = /^Put (\w+), (\w+) and (\w+) in order\. Start with the game with the most votes\.$/.exec(q.prompt);
        if (!match) throw Error(`Unrecognised prompt: ${q.prompt}`);
        const names = match.slice(1);
        expect(rows.size).toBe(5);
        expect(q.context?.join(' ')).toContain('1 vote');
        expect(new Set(rows.values()).size).toBe(4);
        expect(new Set(names.map(name => lookup(rows, name))).size).toBe(3);
        expect(q.order?.slice().sort()).toEqual([...names].sort());
        // A label's place is the number of requested games with more votes.
        const places = names.map(name => names.filter(other => lookup(rows, other) > lookup(rows, name)).length);
        const result = [0, 1, 2].map(place => names[places.indexOf(place)]);
        expected = result.join(',');
        wrong = result.slice().reverse().join(',');
        rankPositions.add(places.join(','));
      }
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, wrong)).toBe(false);
    }
  }
  expect([...words].sort()).toEqual(['fewer', 'fewest', 'more', 'most']);
  expect(rankPositions.size).toBe(6);
});

it('keeps the shared sticker graph across its two prompts and reproduces each item', () => {
  for (const seed of [0, 8, 17, 42]) {
    for (const start of [0, 3, 6]) {
      const batch = [start, start + 1, start + 2].map(index => {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        return q;
      });
      const stickerQuestions = batch.filter(q => q.choices);
      expect(stickerQuestions).toHaveLength(2);
      expect(stickerQuestions[0].picture).toEqual(stickerQuestions[1].picture);
      expect(batch.filter(q => q.order)).toHaveLength(1);
    }
  }
});
