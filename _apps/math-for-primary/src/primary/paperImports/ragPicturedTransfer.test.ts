import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragPicturedTransfer';

test('each picture and its stated transfer direction determine all three entries', () => {
  const givers = new Set<string>();
  const movesSeen = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const picture = q.picture;
      if (picture?.type !== 'paper' || picture.layout !== 'cards') throw Error('Expected two pictured collections');
      expect(picture.cards).toHaveLength(2);
      const [first, second] = picture.cards;
      if (first?.count === undefined || second?.count === undefined) throw Error('Both pictures need countable pencils');
      for (const card of picture.cards) {
        expect(card.icon).toBe('pencil');
        expect(Number.isInteger(card.count)).toBe(true);
        expect(card.count).toBeGreaterThanOrEqual(2);
        expect(card.count).toBeLessThanOrEqual(12);
      }

      const direction = /How many pencils should (\w+) give (\w+) so/.exec(q.prompt);
      if (!direction) throw Error('Expected a named giver and receiver');
      const [, giver, receiver] = direction;
      const start = picture.cards.find(card => card.label === giver)?.count;
      const other = picture.cards.find(card => card.label === receiver)?.count;
      if (start === undefined || other === undefined) throw Error('Both children must appear in the picture');
      expect(start).toBeGreaterThan(other);
      expect(q.unit).toBe('pencils');
      expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [
        { label: `${first.label}’s pencils at the start` },
        { label: `${second.label}’s pencils at the start` },
        { label: `Pencils ${giver} gives ${receiver}` },
      ] });

      // Try moving pencils one by one using only the labelled starting pictures.
      const solutions: number[] = [];
      for (let n = 0; n <= start; n++) {
        if (start - n === other + n) solutions.push(n);
      }
      expect(solutions).toHaveLength(1);
      const move = solutions[0];
      const entries = (a: number, b: number, c: number) => JSON.stringify([a, b, c].map(String));
      const expected = entries(first.count, second.count, move);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, entries(second.count, first.count, move))).toBe(false);
      expect(correctAnswer(q, entries(first.count, second.count, start - other))).toBe(false);
      expect(correctAnswer(q, String(move))).toBe(false);
      givers.add(giver);
      movesSeen.add(move);
    }
  }
  expect(givers).toEqual(new Set(['Siti', 'Arun']));
  expect(movesSeen).toEqual(new Set([1, 2, 3, 4]));
});

test('seed and index reproduce the question and allow different collections', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const pictures = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(1);
});
