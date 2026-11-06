import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragReadGroupCountAndSize';

// Interpret a pupil-facing label or sentence, including a description whose
// factors give the right total but are in the wrong order for the picture.
function describesTrayPicture(text: string, trays: number, pencils: number): boolean {
  const pair = /^(?:The picture shows )?(\d+) groups of (\d+)\.?$/.exec(text);
  if (pair) return Number(pair[1]) === trays && Number(pair[2]) === pencils;
  const short = /^(\d+) (twos|threes|fours|fives)$/.exec(text);
  if (short) {
    const size = ['twos', 'threes', 'fours', 'fives'].indexOf(short[2]) + 2;
    return Number(short[1]) === trays && size === pencils;
  }
  const containers = /^There are (\d+) trays\.$/.exec(text);
  if (containers) return Number(containers[1]) === trays;
  const contents = /^Each tray holds (\d+) pencils\.$/.exec(text);
  if (contents) return Number(contents[1]) === pencils;
  throw new Error(`Unrecognised choice: ${text}`);
}

test('solve every response form from its displayed trays or multiplication', () => {
  const forms = new Set<string>();
  const pairs = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      let trays: number;
      let pencils: number;
      if (q.picture) {
        const picture = q.picture;
        if (picture.type !== 'paper' || picture.layout !== 'cards') throw new Error('Expected separate trays');
        trays = picture.cards.length;
        const first = picture.cards[0]?.count;
        if (typeof first !== 'number') throw new Error('Missing pencil icons');
        pencils = first;
        for (const card of picture.cards) {
          expect(card.icon).toBe('pencil');
          expect(card.count).toBe(pencils);
          expect(card.removed).toBeUndefined();
        }
      } else {
        const factors = /^(\d+) × (\d+)$/.exec(q.display ?? '');
        if (!factors) throw new Error('Missing visible factors');
        expect(q.context?.join(' ')).toMatch(/first number counts the trays/i);
        expect(q.context?.join(' ')).toMatch(/second number tells how many pencils/i);
        trays = Number(factors[1]);
        pencils = Number(factors[2]);
      }
      for (const value of [trays, pencils]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(2);
        expect(value).toBeLessThanOrEqual(5);
      }
      expect(trays).not.toBe(pencils);
      expect(trays * pencils).toBeLessThanOrEqual(40);
      pairs.add(`${trays}/${pencils}`);

      if (q.choices) {
        expect(q.picture).toBeDefined();
        expect(q.structuredResponse).toBeUndefined();
        const findMistake = q.prompt.includes('mistake');
        expect(q.choices.length).toBe(findMistake ? 3 : 4);
        expect(new Set(q.choices).size).toBe(q.choices.length);
        const winners = q.choices.filter(text => describesTrayPicture(text, trays, pencils) !== findMistake);
        expect(winners).toHaveLength(1);
        expect(q.answer).toBe(winners[0]);
        for (const choice of q.choices) expect(correctAnswer(q, choice)).toBe(choice === winners[0]);
        if (!findMistake) {
          expect(q.choices.some(text => describesTrayPicture(text, pencils, trays))).toBe(true);
        }
        forms.add(findMistake ? 'mistake' : winners[0].includes('groups of') ? 'label' : 'short label');
      } else {
        expect(q.structuredResponse).toMatchObject({
          kind: 'number-pair', firstLabel: 'Number of trays', secondLabel: 'Pencils on each tray',
        });
        const response = JSON.stringify([String(trays), String(pencils)]);
        expect(q.answer).toBe(response);
        expect(correctAnswer(q, response)).toBe(true);
        expect(correctAnswer(q, JSON.stringify([String(pencils), String(trays)]))).toBe(false);
        expect(correctAnswer(q, String(trays * pencils))).toBe(false);
        forms.add(q.picture ? 'picture pair' : 'symbol pair');
      }
    }
  }
  expect(forms).toEqual(new Set(['mistake', 'label', 'short label', 'picture pair', 'symbol pair']));
  expect(pairs.size).toBeGreaterThan(8);
});

test('a seed and index reproduce the same exercise', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(-5, 3)).toEqual(makeRagQuestion(-5, 3));
});
