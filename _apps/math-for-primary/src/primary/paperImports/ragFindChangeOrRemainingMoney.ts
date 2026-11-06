import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p1-find-change-or-remaining-money',
  level: 1,
  title: 'Money after a purchase',
  objective: 'Find the amount available in the same unit as the price, then subtract the price.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.05', 'P1.S.MD.01'],
  canonicalPatternId: 'p1-find-change-or-remaining-money',
};

const forms = ['purse', 'notes', 'cents'] as const;
const dollars = (n: number) => '$' + n;

function working(steps: { text: string; equation: string }[]) {
  return {
    workedSteps: steps,
    explanation: steps.map(step => step.text + ' ' + step.equation).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = forms[(hashString(String(seed)) + (index >>> 0)) % forms.length];

  if (form === 'purse') {
    const coins = Array<number>(r.int(1, 3)).fill(1);
    const pieces = r.shuffle([r.pick([10, 50]), r.pick([2, 5, 10]), r.pick([2, 5, 10]), ...coins]);
    const total = pieces.reduce((sum, value) => sum + value, 0);
    const price = r.int(4, Math.min(18, total - 1));
    const left = total - price;
    return {
      key,
      context: ['Each tile shows one note or coin in Mei’s purse.', `Mei buys a skipping rope for ${dollars(price)}.`],
      picture: { type: 'pattern', items: pieces.map(value => `${dollars(value)} ${value === 1 ? 'coin' : 'note'}`) },
      prompt: 'How many dollars are still in her purse? Fill in the number sentence.',
      numberSentence: { numbers: [total, price], operation: '-', freeEntry: true, chooseOperation: true, missingResult: true },
      answer: `${total} - ${price} = ${left}`,
      unit: 'dollars',
      hint: 'Read each tile once. What was in the purse before Mei bought the rope?',
      ...working([
        { text: 'Add the value of each note and coin.', equation: `${pieces.map(dollars).join(' + ')} = ${dollars(total)}` },
        { text: 'Take the price of the rope from the money in the purse.', equation: `${dollars(total)} − ${dollars(price)} = ${dollars(left)}` },
      ]),
    };
  }

  if (form === 'notes') {
    const count = r.int(3, 4);
    const face = r.pick([2, 5, 10]);
    const payment = count * face;
    const price = r.int(3, payment - 1);
    const change = payment - price;
    return {
      key,
      context: [
        `Hana buys a puzzle for ${dollars(price)}.`,
        `She hands over ${count} notes. Each note is worth ${dollars(face)}.`,
        'Write a number sentence for each step in your working.',
      ],
      prompt: 'How much are the notes worth altogether? How much change does Hana get?',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Value of all the notes ($)', secondLabel: 'Change ($)' },
      answer: JSON.stringify([String(payment), String(change)]),
      hint: 'Count in steps of one note’s value. Then take away the price of the puzzle.',
      ...working([
        { text: `There are ${count} notes worth ${dollars(face)} each.`, equation: `${count} × ${dollars(face)} = ${dollars(payment)}` },
        { text: 'Take away the price of the puzzle to find the change.', equation: `${dollars(payment)} − ${dollars(price)} = ${dollars(change)}` },
      ]),
    };
  }

  const price = r.pick([10, 20, 30, 60, 70, 80, 90]);
  const left = 100 - price;
  return {
    key,
    context: ['Zara has $1.', `She buys a sticker for ${price} cents.`],
    prompt: 'How many cents does Zara have now?',
    choices: r.shuffle([left, price, left / 10, price / 10].map(String)),
    answer: String(left),
    unit: 'cents',
    hint: 'Count one dollar in cents before you take away the price.',
    ...working([
      { text: 'Write the money Zara has in cents.', equation: '$1 = 100 cents' },
      { text: 'Take the sticker price from those 100 cents.', equation: `100 cents − ${price} cents = ${left} cents` },
    ]),
  };
}
