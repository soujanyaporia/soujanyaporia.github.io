import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-whole-pack-bounds',
  level: 4,
  title: 'Shopping in whole packs',
  objective: 'Use pack sizes and prices to find how many items a budget buys or the least cost of buying enough items.',
  skillIds: ['P4.S.MD.03', 'P4.S.MD.01', 'P4.S.GRAPH.01'],
  canonicalPatternId: 'p4-whole-packs-under-a-budget-or-target',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) % 4 + 4) % 4;
  const size = r.pick([5, 7, 8, 9]);
  const price = r.int(5, 9);
  function entry(prompt: string, context: string[], value: number, unit: string, hint: string, steps: Steps, picture?: Question['picture']): Question {
    return { key, prompt, context, answer: String(value), unit, hint, workedSteps: steps,
      explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
      ...(picture ? { picture } : {}) };
  }

  function affordable(budget: number, context: string[], steps: Steps): Question {
    const packs = Math.floor(budget / price);
    const left = budget - packs * price;
    steps.push(
      { text: `She can pay for ${packs} packs.`, equation: `${packs} × $${price} = $${packs * price}` },
      { text: `The $${left} left is less than the price of another pack.`, equation: `$${budget} − $${packs * price} = $${left}` },
      { text: 'Count the bookmarks in those packs.', equation: `${packs} × ${size} = ${packs * size} bookmarks` },
    );
    return entry('What is the greatest number of bookmarks Hana can buy?', context, packs * size, 'bookmarks',
      'Find how much Hana can spend. How many full packs can she pay for with that money?', steps);
  }

  if (variant === 0) {
    const budget = r.int(5, 14) * price + r.int(1, price - 1);
    return affordable(budget, [
      `The school shop sells bookmarks only in packs of ${size}. A pack costs $${price}.`,
      `Hana has $${budget} to spend.`,
    ], []);
  }

  if (variant === 1) {
    const oldSize = r.pick([3, 4, 6]);
    const oldPrice = r.int(2, price - 1);
    const counts = Array.from({ length: 12 }, (_, i) => i + 8).filter(n => (n * oldPrice) % price !== 0);
    const oldPacks = r.pick(counts);
    const bought = oldPacks * oldSize;
    const budget = oldPacks * oldPrice;
    return affordable(budget, [
      `Last week, a pack of ${oldSize} bookmarks cost $${oldPrice}. Hana bought ${bought} bookmarks in those packs.`,
      `This week, bookmarks are sold only in packs of ${size} for $${price} a pack. Hana has the same amount to spend as she paid last week.`,
    ], [
      { text: 'How many packs did she buy last week?', equation: `${bought} ÷ ${oldSize} = ${oldPacks} packs` },
      { text: 'Use last week’s cost as this week’s budget.', equation: `${oldPacks} × $${oldPrice} = $${budget}` },
    ]);
  }

  if (variant === 2) {
    const target = r.int(6, 16) * size + r.int(1, size - 1);
    const packs = Math.ceil(target / size);
    const fewer = packs - 1;
    return entry('What is the least amount Ravi needs to spend?', [
      `Party hats come only in packs of ${size}. One pack costs $${price}.`,
      `Ravi needs at least ${target} hats.`,
    ], packs * price, 'dollars', 'Check the number of hats in the packs. If there are too few hats, you need one more whole pack.', [
      { text: `With ${fewer} packs there would be too few hats.`, equation: `${fewer} × ${size} = ${fewer * size} hats` },
      { text: `One more pack gives Ravi enough for all ${target} hats he needs.`, equation: `${packs} × ${size} = ${packs * size} hats` },
      { text: 'Find the cost of the fewest packs that will do.', equation: `${packs} × $${price} = $${packs * price}` },
    ]);
  }

  const cardPrice = r.int(2, 4);
  const cardSize = r.pick([3, 4, 6]);
  // Each share pays for whole packs of either kind.
  const share = cardPrice * price * r.int(2, 5);
  const rows = r.shuffle([{ label: 'Badges', values: [size, price] }, { label: 'Cards', values: [cardSize, cardPrice] }]);
  const badgePacks = share / price;
  return entry('How many badges did Siti buy?', [
    'Siti bought whole packs of badges and cards for her club.',
    `She spent $${2 * share} altogether. She spent the same amount on badges as on cards.`,
  ], badgePacks * size, 'badges', 'First share the total cost equally. Then use the badges row to find how many badges that money buys.', [
    { text: 'Half the money went towards badges.', equation: `$${2 * share} ÷ 2 = $${share}` },
    { text: 'Divide by the price of one pack of badges.', equation: `${share} ÷ ${price} = ${badgePacks} packs` },
    { text: 'Count the badges in those packs.', equation: `${badgePacks} × ${size} = ${badgePacks * size} badges` },
  ], { type: 'nanyang-p4', layout: 'table', caption: 'Club shop prices', rowHeader: 'Item', columns: ['Items per pack', 'Price per pack ($)'], rows });
}
