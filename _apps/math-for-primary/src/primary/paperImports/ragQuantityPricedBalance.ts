import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-quantity-priced-balance',
  level: 3,
  title: 'Money before and after shopping',
  objective: 'Use a unit price and a quantity to find change, starting money or the cost of another purchase.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-payment-balance-with-quantity-priced-purchases',
};

type Step = { text: string; equation: string };
const dollars = (cents: number) => (cents / 100).toFixed(2);
const price = (cents: number) => '$' + dollars(cents);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['change', 'starting-money', 'missing-cost'] as const);
  const byMass = variant === 'change';
  const quantity = byMass ? rng.int(3, 5) : rng.pick([2, 4, 5, 6]);
  const unitPrice = 5 * (byMass ? rng.int(45, 64) : rng.int(13, 29));
  const fixedCost = 5 * (byMass ? rng.int(25, 38) : rng.int(48, 115));
  const quantityCost = quantity * unitPrice;
  const totalCost = fixedCost + quantityCost;
  const quantityStep = {
    text: byMass ? `Find the cost of ${quantity} kg of oranges.` : `Find the cost of ${quantity} pens.`,
    equation: `${quantity} × ${price(unitPrice)} = ${price(quantityCost)}`,
  };
  const totalStep = {
    text: 'Add the costs of both purchases.',
    equation: `${price(fixedCost)} + ${price(quantityCost)} = ${price(totalCost)}`,
  };

  function question(context: string[], prompt: string, answerCents: number, hint: string, workedSteps: Step[], options?: number[]): Question {
    return {
      key, context, prompt, hint, workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
      ...(options
        ? { answer: price(answerCents), choices: rng.shuffle(options.map(price)) }
        : { answer: dollars(answerCents), unit: 'dollars' }),
    };
  }

  if (variant === 'change') {
    // Leave room for a plausible answer obtained by charging for one extra kilogram.
    const payment = rng.pick([1000, 1500, 2500, 3000].filter(cents => cents > totalCost + unitPrice));
    const change = payment - totalCost;
    const options = [change, change - fixedCost, change + unitPrice, rng.pick([change - unitPrice, change + fixedCost])];
    return question([
      `Jia buys one pineapple for ${price(fixedCost)} and ${quantity} kg of oranges at ${price(unitPrice)} per kg.`,
      `She gives the seller ${price(payment)}.`,
    ], 'How much change should Jia receive?', change,
    'First find the price of all the oranges. Remember to pay for the pineapple too.',
    [quantityStep, totalStep, {
      text: 'Take the shopping cost away from the money Jia hands over.',
      equation: `${price(payment)} − ${price(totalCost)} = ${price(change)}`,
    }], options);
  }

  if (variant === 'starting-money') {
    const left = 5 * rng.int(62, 218);
    const start = totalCost + left;
    return question([
      `Mira buys one pencil case for ${price(fixedCost)} and ${quantity} pens at ${price(unitPrice)} each.`,
      `She has ${price(left)} left after paying.`,
    ], 'How much money did Mira have before she bought the pens and pencil case?', start,
    'Think of the money Mira started with as two parts: what she spent and what she kept.',
    [quantityStep, totalStep, {
      text: 'Put the money Mira spent back with the money she has left.',
      equation: `${price(totalCost)} + ${price(left)} = ${price(start)}`,
    }]);
  }

  const notes = rng.int(3, 5);
  const noteValue = rng.pick([500, 1000]);
  const start = notes * noteValue;
  const left = start - totalCost;
  const spent = start - left;
  return question([
    `Kai has ${notes} notes worth ${price(noteValue)} each. This is all his money.`,
    `He buys ${quantity} pens at ${price(unitPrice)} each and one pencil case.`,
    `After paying, he has ${price(left)} left.`,
  ], 'How much did Kai pay for the pencil case?', spent - quantityCost,
  'Count the money in the notes. Find how much Kai spent, then take out the cost of the pens.',
  [{
    text: 'Count the money Kai had at the start.',
    equation: `${notes} × ${price(noteValue)} = ${price(start)}`,
  }, {
    text: 'Take away the money left to find how much he spent.',
    equation: `${price(start)} − ${price(left)} = ${price(spent)}`,
  }, quantityStep, {
    text: 'The rest of his spending paid for the pencil case.',
    equation: `${price(spent)} − ${price(quantityCost)} = ${price(spent - quantityCost)}`,
  }]);
}
