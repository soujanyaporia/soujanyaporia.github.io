import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-graphed-count-cost-in-dollars',
  level: 3,
  title: 'Find the cost of the beads',
  objective: 'Read a quantity from a scaled graph and use a price in cents to find the cost in dollars.',
  skillIds: ['P3.S.GRAPH.01', 'P3.S.MD.03', 'P2.S.MONEY.03'],
  canonicalPatternId: 'p3-value-from-graphed-counts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const labels = ['Mei', 'Arif', 'Devi', 'Yun', 'Ben'];
  const scale = rng.pick([5, 10]);
  const intervals = rng.shuffle([2, 3, 4, 5, 6, 7]).slice(0, labels.length);
  const values = intervals.map(count => count * scale);
  const target = rng.int(0, labels.length - 1);
  const buyer = labels[target];
  const quantity = values[target];
  const priceCents = rng.int(5, 9);
  const totalCents = quantity * priceCents;
  const dollars = (totalCents / 100).toFixed(2);
  const pictures = rng.chance(0.5);

  const workedSteps = [
    {
      text: pictures
        ? `Count the ${intervals[target]} dots beside ${buyer}. Each dot stands for ${scale} beads.`
        : `Start at zero. The bar for ${buyer} reaches ${intervals[target]} steps up the scale. Each step stands for ${scale} beads.`,
      equation: `${intervals[target]} × ${scale} = ${quantity} beads`,
    },
    {
      text: `Each of those beads costs ${priceCents} cents. Find what ${buyer} pays for all of them.`,
      equation: `${quantity} × ${priceCents} = ${totalCents} cents`,
    },
    {
      text: 'Write the cost in dollars. Every 100 cents make one dollar.',
      equation: `${totalCents} cents = $${dollars}`,
    },
  ];

  return {
    key,
    context: ['The graph shows how many beads each child bought.', `Each bead costs ${priceCents} cents.`],
    picture: { type: 'bars', labels, values, scale, pictures },
    prompt: `How much did ${buyer} pay for the beads? Give your answer in dollars.`,
    answer: dollars,
    unit: 'dollars',
    hint: `Find ${buyer} on the graph. Work out the number of beads first, then use the price of one bead.`,
    explanation: `${buyer} bought ${quantity} beads. At ${priceCents} cents each, they cost ${totalCents} cents, or $${dollars}.`,
    workedSteps,
    proof: { op: '/', a: { op: '*', a: quantity, b: priceCents }, b: 100 },
  };
}
