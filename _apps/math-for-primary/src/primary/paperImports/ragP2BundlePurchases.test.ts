import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2BundlePurchases';

function costFromOffer(text: string, item: string, quantity: number): number {
  const offers = text.matchAll(/A pack of (\d+) (stickers|pens) costs \$(\d+)\./g);
  const offer = Array.from(offers).find(match => match[2] === item);
  if (!offer) throw new Error(`Missing pack price for ${item}`);
  const size = Number(offer[1]);
  const price = Number(offer[3]);
  expect([2, 3, 4, 5, 10]).toContain(size);
  expect(price).toBeGreaterThan(0);
  expect(quantity).toBeGreaterThan(0);
  expect(quantity % size).toBe(0);

  // Buy one pack at a time until the shopping list is filled.
  let cost = 0;
  for (let bought = 0; bought < quantity; bought += size) cost += price;
  return cost;
}

it('solves both questions from the shopping list, pack offers and any starting money', () => {
  const prompts = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      const list = /Siti buys (\d+) stickers and (\d+) pens in full packs\./.exec(text);
      if (!list) throw new Error('Missing purchase quantities');
      const spent = costFromOffer(text, 'stickers', Number(list[1]))
        + costFromOffer(text, 'pens', Number(list[2]));
      const opening = /Siti starts with \$(\d+)\./.exec(text);
      let expected = spent;
      if (q.prompt === 'How much money does Siti have left after shopping?') {
        if (!opening) throw new Error('Missing starting money');
        expected = Number(opening[1]) - spent;
        expect(expected).toBeGreaterThan(0);
      } else {
        expect(q.prompt).toBe('How much does Siti spend altogether?');
        expect(opening).toBeNull();
      }
      prompts.add(q.prompt);
      expect(q.unit).toBe('dollars');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.answer).toBe(String(expected));
      expect(q.workedSteps?.at(-1)?.equation).toMatch(new RegExp(`= \\$${expected}$`));
    }
  }
  expect(prompts.size).toBe(2);
});

it('replays a question exactly and varies the visible quantities within each task', () => {
  const listsByPrompt = new Map<string, Set<string>>();
  for (let seed = 0; seed < 24; seed++) {
    const q = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 1)).toEqual(q);
    const list = q.context?.find(line => line.startsWith('Siti buys '));
    if (!list) throw new Error('Missing shopping list');
    const lists = listsByPrompt.get(q.prompt) ?? new Set<string>();
    lists.add(list);
    listsByPrompt.set(q.prompt, lists);
  }
  expect(listsByPrompt.size).toBe(2);
  for (const lists of listsByPrompt.values()) expect(lists.size).toBeGreaterThan(1);
});
