import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragIdentifyPurchases';

function cents(value: string): number {
  const match = /^\$(\d+)(?:\.(\d{2}))?$/.exec(value);
  if (!match) throw new Error('Expected a price in dollars: ' + value);
  return Number(match[1]) * 100 + Number(match[2] ?? 0);
}

function readTags(q: Question) {
  const list = q.picture;
  if (list?.type !== 'paper' || list.layout !== 'cards') throw new Error('Missing price list');
  expect(list.cards).toHaveLength(4);
  const tags = list.cards.map(card => ({ name: card.label, price: cents(card.value) }));
  expect(new Set(tags.map(tag => tag.name)).size).toBe(4);
  expect(new Set(tags.map(tag => tag.price)).size).toBe(4);
  expect(tags.every(tag => tag.price > 0)).toBe(true);
  return tags;
}

it('identifies the only listed item that accounts for all the money', () => {
  const lettersFound = new Set<string>();
  const namesFound = new Set<string>();
  for (let seed = 0; seed < 72; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      const amounts = Array.from(story.matchAll(/\$\d+(?:\.\d{2})?/g), m => cents(m[0]));
      const tags = readTags(q);

      if (q.prompt.includes('letter')) {
        expect(story).toMatch(/gave her sister .*bought one item .* left/);
        expect(amounts).toHaveLength(3);
        const [start, gift, left] = amounts;
        expect(gift).toBeGreaterThan(0);
        expect(left).toBeGreaterThan(0);
        const matches = tags.filter(tag => gift + tag.price + left === start);
        expect(matches).toHaveLength(1);
        const letters = tags.map(tag => /^([A-D])\. .+$/.exec(tag.name)?.[1]);
        expect(letters).toEqual(['A', 'B', 'C', 'D']);
        expect(q.choices).toEqual(letters);
        const expected = matches[0].name.charAt(0);
        lettersFound.add(expected);
        expect(q.answer).toBe(expected);
      } else {
        expect(q.prompt).toMatch(/name on the price list/);
        const named = /chose a (.+?) and one other item/.exec(story)?.[1];
        const known = tags.find(tag => tag.name === named);
        if (!known) throw new Error('The named purchase needs a price tag');
        expect(amounts).toHaveLength(2);
        const [paid, change] = amounts;
        expect(change).toBeGreaterThan(0);
        const matches = tags.filter(tag => tag !== known && known.price + tag.price + change === paid);
        expect(matches).toHaveLength(1);
        const expected = matches[0].name;
        namesFound.add(expected);
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(expected);
      }
    }
  }
  expect(lettersFound.size).toBe(4);
  expect(namesFound.size).toBe(3);
});

it('repeats a given seed and index and varies the visible task across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    stories.add(JSON.stringify([q.context, q.picture]));
  }
  expect(stories.size).toBeGreaterThan(1);
});
