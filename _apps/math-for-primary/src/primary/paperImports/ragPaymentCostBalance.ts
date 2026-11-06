import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-payment-cost-balance',
  level: 2 as const,
  title: 'Find the change or the starting amount',
  objective: 'Use the prices and the money left to find how much was paid, returned or held at first.',
  skillIds: ['P2.S.AS.01', 'P2.S.MONEY.03', 'P2.S.MONEY.04'],
  canonicalPatternId: 'payment-cost-and-balance',
};

const forms = ['shop', 'two-cent-prices', 'purchase-and-gift', 'one-cent-price', 'starting-money'] as const;
type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = (Math.trunc(seed) + Math.trunc(index)) % forms.length;
  const form = forms[(offset + forms.length) % forms.length];
  const name = rng.pick(['Mei', 'Priya', 'Nora', 'Sara']);

  function question(context: string[], prompt: string, unit: 'cents' | 'dollars', amount: number, hint: string, workedSteps: Step[]): Question {
    return {
      key, context, prompt, unit, answer: String(amount), hint, workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (form === 'two-cent-prices' || form === 'one-cent-price') {
    const pair = form === 'two-cent-prices';
    const paidDollars = pair ? 1 : rng.int(2, 4);
    const paidCents = 100 * paidDollars;
    const first = pair ? 5 * rng.int(2, 5) : 5 * rng.int(13, 35);
    const second = pair ? 5 * rng.int(7, 12) : 0;
    const cost = first + second;
    const change = paidCents - cost;
    const purchase = pair
      ? `${name} buys a sticker for ${first}¢ and a bookmark for ${second}¢.`
      : `${name} buys a bun for ${first}¢.`;
    const steps = [{ text: 'Write the payment in cents.', equation: `$${paidDollars} = ${paidCents}¢` }];
    if (pair) steps.push({ text: 'Add the two prices.', equation: `${first}¢ + ${second}¢ = ${cost}¢` });
    steps.push({ text: 'Take the cost away from the payment.', equation: `${paidCents}¢ − ${cost}¢ = ${change}¢` });
    return question([purchase, `She hands the cashier $${paidDollars}.`], `How many cents should ${name} get back?`, 'cents', change,
      pair ? 'How many cents did she hand over? Find how much both items cost together.' : 'Each dollar is 100 cents. Write the payment in cents before taking away the price.', steps);
  }

  const first = rng.int(135, 285);
  const second = rng.int(32, 78);
  const total = first + second;
  const purchase = `${name} buys a guitar for $${first} and a music stand for $${second}.`;
  const gift = form === 'purchase-and-gift';
  const addStep = {
    text: gift ? 'Add the price of the guitar and the money given away.' : 'Add the prices of the guitar and the stand.',
    equation: `$${first} + $${second} = $${total}`,
  };

  if (form === 'starting-money') {
    const left = rng.int(24, 190);
    const start = total + left;
    return question([purchase, `After paying, she has $${left} left.`], `How many dollars did ${name} have at first?`, 'dollars', start,
      'Think about the money she spent and the money still in her purse.', [addStep,
        { text: 'Put the money spent back with the money left.', equation: `$${total} + $${left} = $${start}` },
      ]);
  }

  const available = 100 * (Math.floor(total / 100) + rng.int(1, 3));
  const left = available - total;
  const context = gift
    ? [`${name} starts with $${available}.`, `She buys a guitar for $${first}.`, `She gives her brother $${second}.`]
    : [purchase, `She hands the cashier $${available}.`];
  const prompt = gift ? `How many dollars does ${name} have left?` : `How many dollars should ${name} get back?`;
  return question(context, prompt, 'dollars', left,
    gift ? 'Find how much money left her purse altogether.' : 'Find the cost of both items before working out the change.', [addStep,
      { text: gift ? 'Subtract both amounts from the money she had.' : 'Subtract the total cost from the payment.', equation: `$${available} − $${total} = $${left}` },
    ]);
}
