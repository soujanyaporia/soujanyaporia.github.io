import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-identify-purchases',
  level: 3,
  title: 'Which item was bought?',
  objective: 'Use the money left or the change from a payment to work out a price and identify an item.',
  skillIds: ['P3.S.MONEY.01'],
  canonicalPatternId: 'p3-identify-purchases-from-expenditure-or-change',
};

type Item = { label: string; cents: number };
const dollars = (cents: number) => '$' + (cents / 100).toFixed(2);
const wholeDollars = (cents: number) => '$' + String(cents / 100);

function priceList(items: Item[], format: (cents: number) => string): PaperPicture {
  return {
    type: 'paper',
    layout: 'cards',
    heading: 'Price list',
    cards: items.map(item => ({ label: item.label, value: format(item.cents) })),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if (rng.chance(0.5)) {
    const letters = ['A', 'B', 'C', 'D'];
    const names = rng.shuffle(['stamp set', 'bead kit', 'sketch pad', 'clay set']);
    const basePrice = rng.int(90, 245) * 5;
    const offsets = rng.shuffle([0, 10, 90, 100]);
    const items = names.map((name, i) => ({
      label: `${letters[i]}. ${name}`,
      cents: basePrice + offsets[i],
    }));
    const bought = rng.int(0, 3);
    const item = items[bought];
    const start = rng.pick([3000, 4000, 6000]);
    const gift = rng.int(121, 270) * 5;
    const available = start - gift;
    const left = available - item.cents;
    const match = `The ${names[bought]} costs ${dollars(item.cents)}, so the answer is ${letters[bought]}.`;

    return {
      key,
      picture: priceList(items, dollars),
      context: [
        `Lina took ${dollars(start)} to a craft fair and gave her sister ${dollars(gift)}.`,
        `She then bought one item from the stall and had ${dollars(left)} left.`,
      ],
      prompt: 'Which item did Lina buy? Choose its letter.',
      choices: letters,
      answer: letters[bought],
      hint: 'How much did Lina have after giving her sister the money? Use what was left after shopping to find the price.',
      workedSteps: [
        { text: 'Find how much Lina had when she reached the stall.', equation: `${dollars(start)} − ${dollars(gift)} = ${dollars(available)}` },
        { text: 'Take away the money she still had after shopping.', equation: `${dollars(available)} − ${dollars(left)} = ${dollars(item.cents)}` },
        { text: match },
      ],
      explanation: `Lina had ${dollars(available)} after giving her sister the money. She kept ${dollars(left)}, so she spent ${dollars(item.cents)}. ${match}`,
    };
  }

  const piano: Item = { label: 'digital piano', cents: rng.int(1020, 1460) * 100 };
  const accessoryNames = ['music stand', 'headphones', 'microphone'];
  const prices = rng.shuffle(Array.from({ length: 34 }, (_, i) => (46 + 3 * i) * 100));
  const accessories = accessoryNames.map((label, i) => ({ label, cents: prices[i] }));
  const other = rng.pick(accessories);
  const items = rng.shuffle([piano, ...accessories]);
  const spent = piano.cents + other.cents;
  const paid = (Math.floor(spent / 10000) + 1) * 10000;
  const change = paid - spent;
  const match = `Only the item labelled “${other.label}” costs ${wholeDollars(other.cents)}.`;

  return {
    key,
    picture: priceList(items, wholeDollars),
    context: [
      'At a music shop, Ravi chose a digital piano and one other item from the price list.',
      `He paid for both with ${wholeDollars(paid)} and got ${wholeDollars(change)} back.`,
    ],
    prompt: 'What else did Ravi buy? Enter the name on the price list.',
    answer: other.label,
    hint: 'First work out the cost of both items. How much of that was for the piano?',
    workedSteps: [
      { text: 'Subtract the change to find the cost of both items.', equation: `${wholeDollars(paid)} − ${wholeDollars(change)} = ${wholeDollars(spent)}` },
      { text: 'Take away the price of the piano.', equation: `${wholeDollars(spent)} − ${wholeDollars(piano.cents)} = ${wholeDollars(other.cents)}` },
      { text: match },
    ],
    explanation: `The two items cost ${wholeDollars(spent)} together. After taking away ${wholeDollars(piano.cents)} for the piano, ${wholeDollars(other.cents)} is left for the other item. ${match}`,
  };
}
