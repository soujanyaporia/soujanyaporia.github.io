import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-payment-or-change-in-denominations',
  level: 2 as const,
  title: 'Count the money at the till',
  objective: 'Count notes or coins and use the price to find the change or the amount handed over.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-payment-or-change-in-denominations',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const series = `${RAG_PATTERN.id}:${seed}`;
  const key = `${series}:${index}`;
  const rng = new Rng(hashString(key));

  if ((hashString(series) + index) % 2 === 0) {
    const single = rng.pick([20, 50]);
    const small = rng.pick([5, 10]);
    const count = rng.int(2, 3);
    const subtotal = count * small;
    const payment = single + subtotal;
    const price = 5 * rng.int(3, payment / 5 - 1);
    const change = payment - price;

    // Include the payment, the price and likely coin-counting errors as alternatives.
    const alternatives = [payment, price, change - small, change + small, change + 5, change + 10];
    const wrong = [...new Set(alternatives)].filter(n => n > 0 && n !== change).slice(0, 3);
    return {
      key,
      context: [
        `Kai buys one bookmark for ${price}¢.`,
        `He gives the cashier one ${single}-cent coin and ${count} ${small}-cent coins.`,
      ],
      prompt: 'How much change should Kai get?',
      choices: rng.shuffle([change, ...wrong]).map(n => `${n}¢`),
      answer: `${change}¢`,
      hint: 'Count all the coins Kai gives the cashier. Then take away the cost of the bookmark.',
      workedSteps: [
        { text: `Count the ${small}-cent coins.`, equation: `${count} × ${small}¢ = ${subtotal}¢` },
        { text: 'Add the other coin to find how much Kai gives the cashier.', equation: `${subtotal}¢ + ${single}¢ = ${payment}¢` },
        { text: 'Take away the price to find the change.', equation: `${payment}¢ − ${price}¢ = ${change}¢` },
      ],
      explanation: `Kai hands over ${payment}¢. The cashier keeps ${price}¢ for the bookmark and gives Kai ${change}¢ back.`,
    };
  }

  const payment = rng.pick([10, 50, 100]);
  const notes = payment === 10 ? [2, 2] : [10, 10, rng.pick([2, 5])];
  if (payment === 100) notes.push(50);
  const coins = Array.from({ length: rng.int(1, 2) }, () => 1);
  const pieces = rng.shuffle([...notes, ...coins]);
  const labels = pieces.map(n => `$${n}`);
  const change = pieces.reduce((sum, value) => sum + value, 0);
  const price = payment - change;
  const item = payment === 10 ? 'a pack of pens' : 'a board game';
  return {
    key,
    context: [
      `Asha buys ${item} for $${price}.`,
      'Each label shows one note or coin that Asha gets back as change.',
    ],
    prompt: 'How much money did Asha hand to the cashier?',
    picture: { type: 'pattern', items: labels },
    unit: 'dollars',
    answer: String(payment),
    hint: 'Count the change first. The money Asha handed over covered both the price and the change.',
    workedSteps: [
      { text: 'Count each note and coin in the change once.', equation: `${labels.join(' + ')} = $${change}` },
      { text: 'Add the price and the change to find what Asha handed over.', equation: `$${price} + $${change} = $${payment}` },
    ],
    explanation: `The cashier keeps $${price} and returns $${change}. Together they make the $${payment} that Asha handed over.`,
  };
}
