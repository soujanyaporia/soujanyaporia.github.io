import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-affordable-purchases',
  level: 1,
  title: 'Choose affordable purchases',
  objective: 'Use price tags to find two items within a budget or to work out the change from one affordable purchase.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-choose-affordable-purchases',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['dollar-pair', 'cent-pair', 'cent-change'] as const);
  const inCents = mode !== 'dollar-pair';
  const asksForChange = mode === 'cent-change';
  const step = inCents ? 5 : 1;
  const amount = (value: number) => inCents ? `${value}¢` : `$${value}`;
  const tag = (value: number) => inCents && value === 100 ? '$1' : amount(value);
  const names = rng.shuffle(inCents
    ? ['badge', 'bookmark', 'sticker', 'ribbon', 'button']
    : ['toy truck', 'paint set', 'picture book']);

  const budget = step * (asksForChange ? rng.int(8, 15) : rng.int(14, 20));
  const cheapest = asksForChange ? budget - step * rng.int(1, 4) : step * rng.int(3, 5);
  const remaining = budget - cheapest;
  // For a pair, only the second price can fit beside the cheapest item.
  // Anything above 'remaining' is too costly even with the cheapest partner.
  const prices = asksForChange
    ? [cheapest, budget + step, budget + 2 * step, budget + 4 * step]
    : [cheapest, remaining - step * rng.int(0, 2), remaining + step,
        ...(inCents ? [budget - step, budget] : [])];
  const shelf = rng.shuffle(prices.map((price, i) => ({ name: names[i], price })));
  const context = [
    `Nora has ${tag(budget)} to spend at the school fair.`,
    ...shelf.map(item => `${item.name} — ${tag(item.price)}`),
  ];

  if (asksForChange) {
    return {
      key, context,
      prompt: 'Nora buys one item. She gives the seller all her money. How much change does she get?',
      choices: rng.shuffle([5, 10, 15, 20]).map(amount),
      answer: amount(remaining),
      hint: 'First look for an item Nora has enough money to buy. Then take its price away from her money.',
      workedSteps: [
        { text: `The ${names[0]} costs ${amount(cheapest)}. Every other price is higher than ${amount(budget)}, so Nora must have bought the ${names[0]}.` },
        { text: 'Take the price away from the money Nora gave the seller.', equation: `${amount(budget)} − ${amount(cheapest)} = ${amount(remaining)}` },
      ],
      explanation: `Nora pays ${amount(budget)} for the ${amount(cheapest)} ${names[0]}. She gets ${amount(remaining)} back.`,
    };
  }

  const partner = prices[1];
  const total = cheapest + partner;
  const pair = [names[0], names[1]];
  const balance = budget === total ? 'She has just enough.' : `She has ${amount(budget - total)} left.`;
  return {
    key, context,
    prompt: 'Which two different items can Nora buy together? Choose one of each.',
    structuredResponse: { kind: 'named-pair', options: shelf.map(item => item.name) },
    answer: JSON.stringify(pair),
    hint: 'Start with the lowest price. How much could Nora still spend on a second item?',
    workedSteps: [
      ...(inCents && budget === 100 ? [{ text: 'Read the budget in cents.', equation: '$1 = 100¢' }] : []),
      { text: `The ${names[0]} is the cheapest item. Find how much Nora could spend after buying it.`, equation: `${amount(budget)} − ${amount(cheapest)} = ${amount(remaining)}` },
      { text: `The ${names[1]} costs ${amount(partner)} and fits. Each other item costs more than ${amount(remaining)}, so it is too dear even with the cheapest item.` },
      { text: 'Add the two prices to check.', equation: `${amount(cheapest)} + ${amount(partner)} = ${amount(total)}` },
    ],
    explanation: `The ${pair.join(' and the ')} cost ${amount(total)} together. ${balance}`,
  };
}
