import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-reconstructing-money-balance',
  level: 5,
  title: 'Reconstruct a money balance',
  objective: 'Recover a money amount from equal payments, change, or an addition followed by spending.',
  skillIds: ['P4.S.DEC.05', 'P5.S.DEC.01', 'P5.S.RATE.02'],
  canonicalPatternId: 'reconstructing-money-balance',
};

// Calculate in whole cents; format dollars only for display and answers.
const cash = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
type Step = {text: string; equation: string};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) % 3 + Math.trunc(index) % 3) % 3 + 3) % 3;
  const make = (
    context: string[],
    prompt: string,
    answerCents: number,
    hint: string,
    steps: Step[],
    choices?: string[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: cash(answerCents),
    unit: 'dollars',
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    const quantity = r.pick([20, 40, 50, 60]);
    const unitCost = r.pick([125, 145, 165, 185, 225, 245, 265]);
    const cost = quantity * unitCost;
    const tendered = (Math.floor(cost / 5000) + 1) * 5000;
    const change = tendered - cost;
    return make(
      [
        `Samir buys ${quantity} notebooks for $${cash(unitCost)} each.`,
        `He receives $${cash(change)} in change. He pays only for the notebooks.`,
      ],
      'How much cash did Samir hand to the cashier?',
      tendered,
      'Find the cost of all the notebooks. The cash handed over also includes the change returned.',
      [
        {text: 'Find the total cost of the notebooks.', equation: `${quantity} × $${cash(unitCost)} = $${cash(cost)}`},
        {text: 'Add the change to find the cash handed over.', equation: `$${cash(cost)} + $${cash(change)} = $${cash(tendered)}`},
      ],
    );
  }

  if (variant === 1) {
    const count = r.pick([12, 18, 24, 36, 48]);
    const payment = r.int(9, 19) * 500;
    const unpaid = r.int(12, 42) * 1000;
    const paid = count * payment;
    const price = paid + unpaid;
    // These represent omitting the balance, omitting repetition, or subtracting debt.
    const options = [...new Set([price, paid, payment + unpaid, paid - unpaid, price + payment])];
    const choices = r.shuffle(options.slice(0, 4).map(cash));
    return make(
      [
        `A family pays for a bicycle in monthly instalments of $${cash(payment)}.`,
        `After ${count} instalments, $${cash(unpaid)} is still unpaid. There was no deposit or extra charge.`,
      ],
      'What is the full price of the bicycle?',
      price,
      'Find how much has already been paid. Add the amount still unpaid.',
      [
        {text: 'Find the total of the monthly payments already made.', equation: `${count} × $${cash(payment)} = $${cash(paid)}`},
        {text: 'Combine the paid and unpaid amounts to find the full price.', equation: `$${cash(paid)} + $${cash(unpaid)} = $${cash(price)}`},
      ],
      choices,
    );
  }

  const added = r.pick([800, 1200, 1600, 2400]);
  const spent = 2800 + 25 * r.int(1, 160);
  const left = 100 + 25 * r.int(1, 23);
  const afterGift = spent + left;
  const initial = afterGift - added;
  return make(
    [
      `Nadia has some money for an outing. Her uncle gives her $${cash(added)} more before she buys anything.`,
      `She spends $${cash(spent)} and has $${cash(left)} left after the outing.`,
    ],
    'How much money did Nadia have before her uncle gave her more?',
    initial,
    'Work backwards: add back the money spent, then take away the extra money received.',
    [
      {text: 'Add back the spending to find the amount after the gift.', equation: `$${cash(spent)} + $${cash(left)} = $${cash(afterGift)}`},
      {text: 'Take away the gift to find the amount before it.', equation: `$${cash(afterGift)} − $${cash(added)} = $${cash(initial)}`},
    ],
  );
}
