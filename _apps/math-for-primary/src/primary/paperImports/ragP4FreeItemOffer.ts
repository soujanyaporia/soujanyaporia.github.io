import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-free-item-offer',
  level: 4,
  title: 'Sketchbooks on offer',
  objective: 'Find the least cost of an exact order or the number of sketchbooks received for a given amount of money.',
  skillIds: ['P4.S.MD.03', 'P4.S.MD.01'],
  canonicalPatternId: 'p4-free-item-offer-target-cost-or-quantity-from-spending',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const findCost = rng.int(0, 1) === 0;
  const price = rng.pick([3, 5, 6]);
  const qualifyingCount = rng.int(2, 6);
  const groups = rng.int(3, 35);
  // Another full set of paid singles would earn another free sketchbook.
  const singles = rng.int(0, qualifyingCount - 1);
  const paid = groups * qualifyingCount + singles;
  const total = paid + groups;
  const cost = paid * price;
  const context = [
    `A sketchbook costs $${price}.`,
    `For every ${qualifyingCount} sketchbooks you pay for, the shop gives you 1 extra sketchbook free.`,
  ];

  if (findCost) {
    const groupSize = qualifyingCount + 1;
    return {
      key, context,
      prompt: `The art club wants exactly ${total} sketchbooks. What is the least the club can pay?`,
      answer: String(cost), unit: 'dollars',
      hint: 'Count how many sketchbooks go home in one full offer group, including the free one.',
      workedSteps: [
        { text: 'Count all the sketchbooks in one offer group.', equation: `${qualifyingCount} + 1 = ${groupSize}` },
        { text: 'Make as many full groups as possible. Each saves the price of one sketchbook.', equation: `${total} = ${groups} × ${groupSize} + ${singles}` },
        { text: 'Count the paid sketchbooks in the groups and add the singles.', equation: `${groups} × ${qualifyingCount} + ${singles} = ${paid}` },
        { text: 'Find the cost of the paid sketchbooks.', equation: `${paid} × $${price} = $${cost}` },
      ],
      explanation: `At most ${groups} full groups fit in the order, so at most ${groups} sketchbooks can be free. Paying for ${paid} gives the club exactly ${total}. The least cost is $${cost}.`,
    };
  }

  return {
    key, context,
    prompt: `The art club spends $${cost} on sketchbooks. How many sketchbooks does it take home, including the free ones?`,
    answer: String(total), unit: 'sketchbooks',
    hint: 'Find how many sketchbooks the money pays for. Count one free sketchbook for each full group of paid ones.',
    workedSteps: [
      { text: 'Divide the amount spent by the price of one sketchbook.', equation: `$${cost} ÷ $${price} = ${paid} paid sketchbooks` },
      { text: `Group the paid sketchbooks in sets of ${qualifyingCount}. Each full set earns one extra.`, equation: `${paid} = ${groups} × ${qualifyingCount} + ${singles}` },
      { text: 'Add the free sketchbooks to the paid sketchbooks.', equation: `${paid} + ${groups} = ${total} sketchbooks` },
    ],
    explanation: `The club pays for ${paid} sketchbooks. Those earn ${groups} free sketchbooks, so the club takes home ${total} altogether.`,
  };
}
