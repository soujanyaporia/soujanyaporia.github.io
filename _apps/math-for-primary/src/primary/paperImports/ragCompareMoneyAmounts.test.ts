import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCompareMoneyAmounts';

function price(question: Question, item: string): number {
  const line = question.context?.find(text => text.startsWith(`A ${item} costs `));
  const tag = line?.match(/\$(\d+)\.$/);
  if (!tag) throw new Error(`Missing price for ${item}`);
  return Number(tag[1]);
}

it('solves the requested amount from the labelled coins or the story', () => {
  const cases = new Set<string>();
  for (let seed = -15; seed <= 30; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      let expected: number;
      if (q.picture) {
        const picture = q.picture;
        if (picture.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing purses');
        const totals = new Map<string, number>();
        expect(picture.cards).toHaveLength(2);
        for (const card of picture.cards) {
          const coins = card.value.split(', ');
          expect(coins).toHaveLength(4);
          expect(new Set(coins).size).toBeGreaterThan(1);
          let cents = 0;
          for (const coin of coins) {
            expect(coin).toMatch(/^(5|10|20|50)¢$/);
            cents += Number(coin.slice(0, -1));
          }
          expect(cents).toBeLessThanOrEqual(100);
          totals.set(card.label, cents);
        }
        const ask = /^How much (more|less) money does (\w+) have than (\w+)\?$/.exec(q.prompt);
        if (!ask) throw new Error('Missing comparison in the prompt');
        const subject = totals.get(ask[2]);
        const other = totals.get(ask[3]);
        if (subject === undefined || other === undefined) throw new Error('Unknown purse owner');
        expected = ask[1] === 'more' ? subject - other : other - subject;
        expect(q.unit).toBe('cents');
        expect(q.workedSteps).toHaveLength(3);
        cases.add(ask[1]);
      } else if (q.prompt.includes('cost together')) {
        expect(q.prompt).toBe('How much less do the cap and lunch box cost together than the school bag?');
        const pair = price(q, 'cap') + price(q, 'lunch box');
        const bag = price(q, 'school bag');
        expect(bag).toBeLessThanOrEqual(100);
        expected = bag - pair;
        expect(q.unit).toBe('dollars');
        cases.add('prices');
      } else {
        expect(q.prompt).toBe('How much money does Hana have?');
        const given = /^Leela has \$(\d+)\. Hana has \$(\d+) more than Leela\.$/.exec(q.context?.join(' ') ?? '');
        if (!given) throw new Error('Missing starting amount or difference');
        expected = Number(given[1]) + Number(given[2]);
        expect(q.unit).toBe('dollars');
        cases.add('larger');
      }
      expect(expected).toBeGreaterThan(0);
      expect(expected).toBeLessThanOrEqual(100);
      expect(q.answer).toBe(String(expected));
      expect(q.choices).toBeUndefined();
      expect(q.numberSentence).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
    }
  }
  expect([...cases].sort()).toEqual(['larger', 'less', 'more', 'prices']);
});

it('replays the same seed and varies visible givens for all three tasks', () => {
  const purses = new Set<string>();
  const prices = new Set<string>();
  const stories = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      if (q.picture) purses.add(JSON.stringify(q.picture));
      else if (q.prompt.includes('cost together')) prices.add(JSON.stringify(q.context?.slice().sort()));
      else stories.add(JSON.stringify(q.context));
    }
  }
  for (const examples of [purses, prices, stories]) expect(examples.size).toBeGreaterThan(5);
});
