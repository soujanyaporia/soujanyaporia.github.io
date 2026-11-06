import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-purchase-subtotals-and-balance',
  level: 2 as const,
  title: 'Money before and after shopping',
  objective: 'Find the cost of the items bought, then use it to find starting money, money left or change.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MD.01', 'P2.S.AS.01', 'P2.S.MONEY.03'],
  canonicalPatternId: 'p2-purchase-subtotals-and-balance',
};

const forms = ['balance', 'opening', 'change', 'opening-cents'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = forms[((hashString(String(seed)) + index) >>> 0) % forms.length];
  const cents = form === 'opening-cents';
  const findOpening = cents || form === 'opening';
  const name = rng.pick(['Mei', 'Asha', 'Nora', 'Lina']);
  const count = rng.int(2, 4);

  // Calculate in whole cents for the cents question and whole dollars otherwise.
  const item = cents ? rng.pick(['stickers', 'beads', 'buttons'])
    : form === 'change' ? rng.pick(['pens', 'cards', 'gift bags'])
    : rng.pick(['kites', 'puzzles', 'caps']);
  const price = cents ? rng.pick([20, 25, 30, 35, 40, 45])
    : form === 'change' ? rng.int(2, 4) : rng.int(5, 28);
  const extra = cents || form === 'change' ? {
    item: rng.pick(['folder', 'badge']),
    price: cents ? rng.pick([110, 125, 140, 155, 175]) : rng.pick([1, 5]),
  } : undefined;
  const groupCost = count * price;
  const spent = groupCost + (extra?.price ?? 0);
  let cash: number;
  switch (form) {
    case 'balance': cash = spent + rng.int(6, 39); break;
    case 'opening': cash = rng.int(32, 85); break;
    case 'change': cash = spent < 10 ? 10 : 50; break;
    case 'opening-cents': cash = rng.pick([200, 300, 500]); break;
  }
  const result = findOpening ? cash + spent : cash - spent;
  const tag = (value: number) => '$' + (cents ? (value / 100).toFixed(2) : String(value));
  const amount = (value: number) => cents ? `${value}¢` : tag(value);

  const context = [`${name} bought ${count} ${item} at ${tag(price)} each.`];
  if (extra) context.push(`She also bought one ${extra.item} for ${tag(extra.price)}.`);
  if (findOpening) context.push(`She had ${tag(cash)} left after shopping.`);
  else if (form === 'change') context.push(`She paid with a ${tag(cash)} note.`);
  else context.unshift(`${name} took ${tag(cash)} to the shop.`);

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (cents && extra) {
    workedSteps.push({
      text: 'One dollar is 100 cents. Write each price and the money left in cents.',
      equation: [price, extra.price, cash].map(value => `${tag(value)} = ${amount(value)}`).join(', '),
    });
  }
  workedSteps.push({
    text: `Count the price once for each of the ${count} ${item}.`,
    equation: `${count} × ${amount(price)} = ${Array(count).fill(amount(price)).join(' + ')} = ${amount(groupCost)}`,
  });
  if (extra) workedSteps.push({
    text: `Add the price of the ${extra.item} to find the cost of everything bought.`,
    equation: `${amount(groupCost)} + ${amount(extra.price)} = ${amount(spent)}`,
  });
  workedSteps.push(findOpening ? {
    text: 'Put the money spent back with the money left to find the starting amount.',
    equation: `${amount(cash)} + ${amount(spent)} = ${amount(result)}`,
  } : {
    text: form === 'change' ? 'Take the total cost away from the value of the note.' : 'Take the cost away from the money brought to the shop.',
    equation: `${amount(cash)} − ${amount(spent)} = ${amount(result)}`,
  });

  const prompt = findOpening ? `How much money did ${name} have before she went shopping?${cents ? ' Give your answer in cents.' : ''}`
    : form === 'change' ? `How much change did ${name} get?` : `How much money did ${name} have left after she paid?`;
  const question: Question = {
    key, context, prompt, workedSteps,
    answer: String(result),
    hint: `First find what all the ${item} cost.${extra ? ` Include the ${extra.item} too.` : ''} ${findOpening ? 'Think about the money she spent and the money she kept.' : 'Which amount did she have before paying?'}`,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
  if (form === 'opening') {
    // Cash left exceeds one item's price, so these four amounts are distinct.
    return { ...question, answer: tag(result), choices: rng.shuffle([spent, result - price, result, result + price].map(tag)) };
  }
  return { ...question, unit: cents ? 'cents' : 'dollars' };
}
