import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragAffordableCombination';

function readCents(label: string) {
  const match = /^\$(\d+)\.(\d{2})$/.exec(label);
  if (!match) throw new Error('Expected a price in dollars and cents: ' + label);
  return 100 * Number(match[1]) + Number(match[2]);
}

const asSet = (names: string[]) => JSON.stringify([...names].sort());

it('solves each shopping question from the price cards, spending limit and requested item count', () => {
  const boards = new Map<string, Set<string>>();
  let sawExactBudget = false;
  for (let seed = -10; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const budgetLabel = q.context?.join(' ').match(/has (\$\d+\.\d{2}) to spend/)?.[1];
      const countWord = q.prompt.match(/Which (two|three) different items/)?.[1];
      const picture = q.picture;
      if (!budgetLabel || !countWord || picture?.type !== 'paper' || picture.layout !== 'cards') {
        throw new Error('The shopper needs a budget, a shopping list size and labelled prices.');
      }
      const budget = readCents(budgetLabel);
      const count = countWord === 'two' ? 2 : 3;
      const leastChange = q.prompt.includes('as little money left as possible');
      const cards = picture.cards;
      const names = cards.map(card => card.label);
      expect(new Set(names).size).toBe(cards.length);
      expect(cards).toHaveLength(count === 3 || leastChange ? 4 : 3);

      // Visit every subset of the displayed cards, independently of the generator's grouping order.
      const groups: { names: string[]; change: number }[] = [];
      for (let mask = 1; mask < 2 ** cards.length; mask++) {
        const picked = cards.filter((_, i) => (mask & (1 << i)) !== 0);
        if (picked.length !== count) continue;
        const cost = picked.reduce((sum, card) => sum + readCents(card.value), 0);
        groups.push({ names: picked.map(card => card.label), change: budget - cost });
      }
      const affordable = groups.filter(group => group.change >= 0);
      expect(affordable.length).toBeLessThan(groups.length);
      if (leastChange) expect(affordable.length).toBeGreaterThan(1);
      const minChange = Math.min(...affordable.map(group => group.change));
      const winners = leastChange ? affordable.filter(group => group.change === minChange) : affordable;
      expect(winners).toHaveLength(1);
      const winner = asSet(winners[0].names);
      sawExactBudget ||= winners[0].change === 0;

      if (count === 2) {
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw new Error('Expected two item selectors.');
        expect(asSet(spec.options)).toBe(asSet(names));
        expect(asSet(JSON.parse(q.answer))).toBe(winner);
        for (const group of groups) {
          const correct = asSet(group.names) === winner;
          for (const order of [group.names, [...group.names].reverse()]) {
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(order))).toBe(correct);
          }
        }
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([names[0], names[0]]))).toBe(false);
      } else {
        const options = q.choices ?? [];
        expect(options).toHaveLength(4);
        const optionSets = options.map(option => asSet(option.split(/, | and /)));
        expect(optionSets.sort()).toEqual(groups.map(group => asSet(group.names)).sort());
        expect(options).toContain(q.answer);
        expect(asSet(q.answer.split(/, | and /))).toBe(winner);
      }
      const mode = leastChange ? 'least change' : countWord;
      const variants = boards.get(mode) ?? new Set<string>();
      variants.add(JSON.stringify([budgetLabel, cards]));
      boards.set(mode, variants);
    }
  }
  for (const mode of ['two', 'three', 'least change']) {
    expect(boards.get(mode)?.size ?? 0).toBeGreaterThan(10);
  }
  expect(sawExactBudget).toBe(true);
});

it('reproduces the cards, choices and worked solution for the same seed and index', () => {
  for (const seed of [-11, 0, 42]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 3)).toEqual(makeRagQuestion(seed, 3));
    expect(makeRagQuestion(seed, 3).key).not.toBe(makeRagQuestion(seed, 0).key);
  }
});
