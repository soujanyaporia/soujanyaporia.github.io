import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-compare-money-amounts',
  level: 1 as const,
  title: 'Compare amounts of money',
  objective: 'Find how much more or less one amount is, or use the extra amount to find the larger total.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-compare-money-amounts-by-difference',
};

function makePurse(rng: Rng, name: string, avoidTotal?: number) {
  const coins = [5, rng.pick([5, 10, 20]), rng.pick([10, 20])];
  const subtotal = coins.reduce((sum, coin) => sum + coin, 0);
  const last = rng.pick([5, 10, 20, 50].filter(coin => subtotal + coin !== avoidTotal));
  coins.push(last);
  coins.sort((a, b) => b - a);
  return { name, coins, total: subtotal + last };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  // Each five-question cycle has three coin comparisons and one of each dollar task.
  const slot = ((hashString(String(seed)) + index) % 5 + 5) % 5;
  if (slot < 3) {
    const mei = makePurse(rng, 'Mei');
    const ravi = makePurse(rng, 'Ravi', mei.total);
    const purses = [mei, ravi];
    const [larger, smaller] = mei.total > ravi.total ? [mei, ravi] : [ravi, mei];
    const gap = larger.total - smaller.total;
    const prompt = rng.chance(0.5)
      ? `How much more money does ${larger.name} have than ${smaller.name}?`
      : `How much less money does ${smaller.name} have than ${larger.name}?`;
    return {
      key, prompt, unit: 'cents', answer: String(gap),
      picture: {
        type: 'paper', layout: 'cards', heading: 'Coins in each purse',
        cards: purses.map(purse => ({
          label: purse.name, icon: 'bag' as const, value: purse.coins.map(coin => `${coin}¢`).join(', '),
        })),
      },
      hint: 'Count the cents in each purse. How far apart are the two totals?',
      workedSteps: [
        ...purses.map(purse => ({
          text: `Count ${purse.name}’s money.`,
          equation: `${purse.coins.map(coin => `${coin}¢`).join(' + ')} = ${purse.total}¢`,
        })),
        { text: 'Take the smaller total from the larger total.',
          equation: `${larger.total}¢ − ${smaller.total}¢ = ${gap}¢` },
      ],
      explanation: `${smaller.name} would need ${gap}¢ more to have as much money as ${larger.name}.`,
      proof: { op: '-', a: larger.total, b: smaller.total },
    };
  }

  if (slot === 3) {
    const cap = rng.int(6, 13);
    const lunchBox = rng.int(7, 14);
    const together = cap + lunchBox;
    const bag = together + rng.int(4, 14);
    const gap = bag - together;
    return {
      key, unit: 'dollars', answer: String(gap),
      context: rng.shuffle([`A cap costs $${cap}.`, `A lunch box costs $${lunchBox}.`, `A school bag costs $${bag}.`]),
      prompt: 'How much less do the cap and lunch box cost together than the school bag?',
      hint: 'Find the cost of buying both the cap and the lunch box first.',
      workedSteps: [
        { text: 'Add the two prices.', equation: `$${cap} + $${lunchBox} = $${together}` },
        { text: 'Find the gap between that cost and the price of the bag.',
          equation: `$${bag} − $${together} = $${gap}` },
      ],
      explanation: `The two items cost $${together} together. Another $${gap} would bring that to the bag’s price of $${bag}.`,
      proof: { op: '-', a: bag, b: { op: '+', a: cap, b: lunchBox } },
    };
  }

  const leela = rng.int(12, 75);
  const extra = rng.int(3, 25);
  const hana = leela + extra;
  return {
    key, unit: 'dollars', answer: String(hana),
    context: [`Leela has $${leela}.`, `Hana has $${extra} more than Leela.`],
    prompt: 'How much money does Hana have?',
    hint: 'Start with Leela’s amount and count on the extra dollars.',
    workedSteps: [
      { text: 'Add the extra dollars to Leela’s amount.', equation: `$${leela} + $${extra} = $${hana}` },
      { text: 'Check that Hana has the stated amount more.', equation: `$${hana} − $${leela} = $${extra}` },
    ],
    explanation: `Hana has $${hana}. That is $${extra} more than Leela’s $${leela}.`,
    proof: { op: '+', a: leela, b: extra },
  };
}
