import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-whole-pack-pricing',
  level: 3,
  title: 'Shopping for whole packs',
  objective: 'Use the size and price of a whole pack to find how many items a budget buys, check purchase claims or compare two stalls.',
  skillIds: ['P3.S.MD.02', 'P3.S.MD.03', 'P3.S.MD.04', 'P2.S.MONEY.02'],
  canonicalPatternId: 'whole-pack-pricing-and-capacity',
};

function compareStalls(r: Rng, key: string): Question {
  const group = r.int(2, 3);
  const quantity = 6 * group * r.int(2, 9);
  // Each group of 6 × group bookmarks can be bought as three small or two large packs.
  const [smallPrice, largePrice] = r.pick([[4, 5], [4, 7], [5, 7], [5, 8]] as const);
  const offers = r.shuffle([{ size: 2 * group, price: smallPrice }, { size: 3 * group, price: largePrice }]);
  const stalls = offers.map(({ size, price }, i) => {
    const packs = quantity / size;
    return { name: i === 0 ? 'Fern Stall' : 'Palm Stall', size, price, packs, total: packs * price };
  });
  const [fern, palm] = stalls;
  const cheaper = fern.total < palm.total ? fern : palm;
  const explanation = `The bookmarks cost $${fern.total} at Fern Stall and $${palm.total} at Palm Stall. ${cheaper.name} costs less.`;
  return {
    key,
    context: [
      `The class needs exactly ${quantity} bookmarks. It will buy them all from one stall. Both stalls sell only whole packs.`,
      ...stalls.map(s => `At ${s.name}, a pack of ${s.size} bookmarks costs $${s.price}.`),
    ],
    prompt: 'Which stall charges less for the class order?',
    choices: stalls.map(s => s.name),
    answer: cheaper.name,
    hint: 'The packs are different sizes. Work out how many packs the class needs at each stall.',
    explanation,
    workedSteps: [
      ...stalls.map(s => ({ text: `Find the number of packs and their cost at ${s.name}.`, equation: `${quantity} ÷ ${s.size} = ${s.packs} packs. ${s.packs} × $${s.price} = $${s.total}.` })),
      { text: explanation },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) + index) % 6 + 6) % 6;
  if (slot === 5) return compareStalls(r, key);

  const size = r.pick([4, 6, 8]);
  const price = r.pick([5, 7, 9]);
  const offer = `A shop sells bookmarks only in whole packs. Each pack holds ${size} bookmarks and costs $${price}.`;

  if (slot < 4) {
    const packs = r.int(3, 10);
    const left = r.int(1, price - 1);
    const budget = packs * price + left;
    const count = packs * size;
    const maximumPrompt = 'How many bookmarks can Mei buy at most?';
    const explanation = `Mei can afford ${packs} packs. The $${left} left over is less than the price of a pack, so ${count} bookmarks is the most she can buy.`;
    const steps = [
      { text: 'Divide the money by the price of one pack.', equation: `${budget} ÷ ${price} = ${packs} remainder ${left}` },
      { text: `Another pack costs $${price}. Mei has only $${left} left after buying ${packs} packs.` },
      { text: 'Count the bookmarks in those packs.', equation: `${packs} × ${size} = ${count} bookmarks` },
    ];
    const context = [offer, `Mei has $${budget} to spend.`];
    const hint = 'Find how many full packs Mei can pay for. Then count the bookmarks in those packs.';
    if (slot !== 3) {
      return { key, context, prompt: maximumPrompt, answer: String(count), unit: 'bookmarks', hint, explanation, workedSteps: steps };
    }

    const orderPacks = r.int(12, 24);
    const order = orderPacks * size;
    const cost = orderPacks * price;
    return {
      key, context,
      prompt: `(a) ${maximumPrompt}\n(b) Ravi buys ${order} bookmarks from the same shop. How much does Ravi pay?`,
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Bookmarks', secondLabel: '(b) Cost in dollars' },
      answer: JSON.stringify([String(count), String(cost)]),
      hint: `${hint} For Ravi, start with his number of bookmarks.`,
      explanation: `${explanation} Ravi buys ${orderPacks} packs for $${cost}.`,
      workedSteps: [
        ...steps,
        { text: 'Find how many packs Ravi buys.', equation: `${order} ÷ ${size} = ${orderPacks} packs` },
        { text: 'Find the cost of his packs.', equation: `${orderPacks} × $${price} = $${cost}` },
      ],
    };
  }

  const packs = r.int(6, 12);
  const spent = packs * price;
  const count = packs * size;
  const fewerPacks = r.int(2, 4);
  const otherPacks = packs - fewerPacks;
  const otherCount = otherPacks * size;
  const otherCost = otherPacks * price;
  const saving = spent - otherCost;
  const claimedCount = count + r.pick([-size, 0, 0, size]);
  const claimedSaving = saving + r.pick([-price, 0, 0, price]);
  const a = claimedCount === count ? 'True' : 'False';
  const b = claimedSaving === saving ? 'True' : 'False';
  return {
    key,
    context: [offer, `Hana spent exactly $${spent} on bookmarks.`, `A. Hana bought ${claimedCount} bookmarks.`, `B. If Hana had bought ${otherCount} bookmarks instead, she would have saved $${claimedSaving}.`],
    prompt: 'Which choice shows whether each statement is true or false?',
    answer: `A: ${a}, B: ${b}`,
    choices: r.shuffle(['A: True, B: True', 'A: True, B: False', 'A: False, B: True', 'A: False, B: False']),
    hint: 'For A, start with the money Hana spent. For B, find the cost of the smaller order and compare it with what she spent.',
    explanation: `Hana bought ${count} bookmarks. The smaller order costs $${otherCost}, so it saves $${saving}. A is ${a.toLowerCase()} and B is ${b.toLowerCase()}.`,
    workedSteps: [
      { text: 'Find the packs Hana paid for.', equation: `${spent} ÷ ${price} = ${packs} packs` },
      { text: `Count her bookmarks. Statement A is ${a.toLowerCase()}.`, equation: `${packs} × ${size} = ${count} bookmarks` },
      { text: 'Price the smaller order.', equation: `${otherCount} ÷ ${size} = ${otherPacks} packs. ${otherPacks} × $${price} = $${otherCost}.` },
      { text: `Find how much Hana would save. Statement B is ${b.toLowerCase()}.`, equation: `$${spent} − $${otherCost} = $${saving}` },
    ],
  };
}
