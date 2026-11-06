import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-repeated-items-purchase',
  level: 3,
  title: 'Several of one item and one extra item',
  objective: 'Use the cost of a group of identical items and the price of one other item to work out a total or a missing cost.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-repeated-items-and-a-separate-purchase',
} as const;

type Story = Pick<Question, 'prompt' | 'answer' | 'hint' | 'structuredResponse'> & {
  context: string[];
  workedSteps: NonNullable<Question['workedSteps']>;
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const price = (cents: number) => '$' + dollars(cents);

function directTotal(r: Rng, sale: boolean): Story {
  const count = r.pick([3, 5, 6, 7]);
  const unit = sale ? 100 * r.int(5, 9) : 25 * r.int(5, 19);
  const extra = sale ? 100 * r.int(16, 23) : 10 * r.int(61, 129);
  const group = count * unit;
  const total = group + extra;
  const items = sale ? 'plants' : 'notebooks';
  return {
    context: sale ? [
      `At the school fair, Hana sold ${count} plants for ${price(unit)} each.`,
      `She also sold one watering can for ${price(extra)}.`,
    ] : [
      `Ravi chose ${count} notebooks priced at ${price(unit)} each.`,
      `He also bought one pencil case for ${price(extra)}.`,
    ],
    prompt: sale ? 'How much money did Hana collect from these sales?' : 'How much did Ravi pay for his shopping?',
    answer: dollars(total),
    hint: `Find the cost of all the ${items} first. Then add the price of the other item once.`,
    workedSteps: [
      { text: `Use the price in cents to find the cost of the ${items}.`, equation: `${count} × ${unit} cents = ${group} cents = ${price(group)}` },
      { text: sale ? 'Add the price of the watering can.' : 'Add the price of the pencil case.', equation: `${price(group)} + ${price(extra)} = ${price(total)}` },
    ],
  };
}

function linkedPrices(r: Rng): Story {
  const count = r.int(3, 6);
  const large = 100 * r.int(18, 29);
  const gap = 100 * r.int(3, 9);
  const small = large - gap;
  const group = count * small;
  const total = large + group;
  return {
    context: [
      `One large kite costs ${price(large)}. It costs ${price(gap)} more than one small kite.`,
      `Mei buys one large kite and ${count} small kites.`,
    ],
    prompt: '(a) What is the price of one small kite?\n(b) How much does Mei pay for all her kites?',
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) One small kite (dollars)', secondLabel: '(b) All the kites (dollars)', decimal: true },
    answer: JSON.stringify([dollars(small), dollars(total)]),
    hint: 'The large kite costs more. Take the difference off its price to find the price you need for part (b).',
    workedSteps: [
      { text: '(a) Subtract the price difference to find the price of one small kite.', equation: `${price(large)} − ${price(gap)} = ${price(small)}` },
      { text: `(b) Use the price from part (a) for each of the ${count} small kites.`, equation: `${count} × ${price(small)} = ${price(group)}` },
      { text: 'Include the large kite once.', equation: `${price(group)} + ${price(large)} = ${price(total)}` },
    ],
  };
}

function subsetCost(r: Rng): Story {
  const count = r.int(4, 7);
  const subset = r.int(2, count - 1);
  const unit = 5 * r.int(12, 25);
  const extra = 25 * r.int(13, 27);
  const group = count * unit;
  const total = group + extra;
  const cost = subset * unit;
  return {
    context: [
      `Idris paid ${price(total)} for ${count} identical badges and one scarf.`,
      `The scarf cost ${price(extra)}. Each badge cost the same amount.`,
    ],
    prompt: `How much did ${subset} of the badges cost?`,
    answer: dollars(cost),
    hint: 'Take the scarf out of the bill. Find the price of one badge before counting the badges in the question.',
    workedSteps: [
      { text: 'Subtract the price of the scarf to find the cost of all the badges.', equation: `${price(total)} − ${price(extra)} = ${price(group)}` },
      { text: 'Share the badge cost equally in cents.', equation: `${price(group)} = ${group} cents. ${group} ÷ ${count} = ${unit} cents per badge` },
      { text: `Count the cost of just ${subset} badges.`, equation: `${subset} × ${unit} cents = ${cost} cents = ${price(cost)}` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 3);
  let story: Story;
  if (variant < 2) story = directTotal(r, variant === 0);
  else if (variant === 2) story = linkedPrices(r);
  else story = subsetCost(r);
  return {
    key,
    ...story,
    unit: 'dollars',
    explanation: story.workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
