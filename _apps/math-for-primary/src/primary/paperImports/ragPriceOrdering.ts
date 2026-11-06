import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-price-ordering',
  level: 2,
  title: 'Compare three prices',
  objective: 'Compare dollars first and cents next to choose an item or put three prices in order.',
  skillIds: ['P2.S.MONEY.02'],
  canonicalPatternId: 'price-ordering-and-comparison',
};

function money(totalCents: number): string {
  const dollars = Math.floor(totalCents / 100);
  const cents = String(totalCents % 100).padStart(2, '0');
  return `$${dollars}.${cents}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const block = Math.floor(index / 4);
  const blockKey = `${RAG_PATTERN.id}:${seed}:${block}`;
  const pairFirst = new Rng(hashString(blockKey)).chance(0.5);
  const schedule = pairFirst
    ? ['highest', 'bag-order', 'amount-order', 'above'] as const
    : ['amount-order', 'above', 'highest', 'bag-order'] as const;
  const task = schedule[index - 4 * block];
  // The two linked questions read the same tags. Each other task gets fresh amounts.
  const setName = task === 'highest' || task === 'bag-order' ? 'linked-tags' : task;
  const rng = new Rng(hashString(`${blockKey}:${setName}`));
  const amountsOnly = task === 'amount-order';
  const dollars = rng.int(14, 36);
  const lowCents = 5 * rng.int(1, 14);
  const highCents = 5 * rng.int(lowCents / 5 + 1, 18);
  const gap = rng.int(1, 3);
  const otherDollars = amountsOnly ? dollars + gap : dollars - gap;
  // Looking at the cents alone must give a different order from looking at the prices.
  const otherCents = amountsOnly
    ? 5 * rng.int(1, highCents / 5 - 1)
    : 5 * rng.int(highCents / 5 + 1, 19);
  const amounts = rng.shuffle([
    100 * dollars + lowCents,
    100 * dollars + highCents,
    100 * otherDollars + otherCents,
  ]);
  const names = ['Red bag', 'Blue bag', 'Green bag'];
  const tags = amounts.map((value, i) => ({ name: names[i], value, price: money(value) }));
  const ranked = [...tags].sort((a, b) => a.value - b.value);
  const [, middle, highest] = ranked;
  const context = tags.map(tag => amountsOnly ? tag.price : `${tag.name} — ${tag.price}`);
  const comparisons = [
    { text: 'Compare the whole dollars first.', equation: `${Math.min(dollars, otherDollars)} dollars < ${Math.max(dollars, otherDollars)} dollars` },
    { text: `Two amounts have ${dollars} whole dollars. Compare their cents.`, equation: `${lowCents}¢ < ${highCents}¢` },
  ];

  function finish(prompt: string, answer: string, response: Pick<Question, 'choices' | 'order'>, text: string, equation: string): Question {
    const workedSteps = [...comparisons, { text, equation }];
    return {
      key: `${RAG_PATTERN.id}:${seed}:${index}`,
      prompt, context, answer, ...response,
      hint: 'Look to the left of the decimal point for dollars. If the dollars match, look at the two digits for cents.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (task === 'highest') {
    return finish('Which bag has the highest price?', highest.name, { choices: names },
      'Read the tag with the highest price.', `${highest.name} — ${highest.price}`);
  }
  if (task === 'above') {
    return finish(`Which bag costs more than the ${middle.name.toLowerCase()}?`, highest.name, { choices: names },
      `The ${highest.name.toLowerCase()} costs more than the ${middle.name.toLowerCase()}.`, `${highest.price} > ${middle.price}`);
  }

  const sequence = amountsOnly ? [...ranked].reverse().map(tag => tag.price) : ranked.map(tag => tag.name);
  const tiles = rng.shuffle(sequence.slice());
  if (tiles.join(',') === sequence.join(',')) tiles.reverse();
  if (amountsOnly) {
    return finish('Tap the three amounts from largest to smallest.', sequence.join(','), { order: tiles },
      'Put the largest amount first.', sequence.join(' > '));
  }
  return finish('Tap the bags in price order, cheapest first.', sequence.join(','), { order: tiles },
    'Match each price to its bag, starting with the lowest price.', ranked.map(tag => `${tag.name} (${tag.price})`).join(' → '));
}
