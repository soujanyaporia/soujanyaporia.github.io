import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-two-item-purchase',
  level: 1,
  title: 'What do the two items cost?',
  objective: 'Find the prices of two named items and write a number sentence for their total in cents or dollars.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'total-purchase-or-denomination-groups',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const cents = rng.chance(0.5);
  const unit = cents ? 'cents' : 'dollars';
  const names = cents ? ['sticker', 'bead', 'button', 'envelope'] : ['kite', 'paint set', 'skipping rope', 'toy drum'];
  const prices = rng.shuffle(cents ? [10, 15, 20, 30, 40, 45, 50] : [4, 5, 6, 7, 9, 12, 14, 16, 18]);
  const priceList = rng.shuffle(names).slice(0, cents ? 2 : 3).map((name, i) => ({ name, price: prices[i] }));
  const [first, second] = rng.shuffle([...priceList]);
  const total = first.price + second.price;
  const tag = (amount: number) => cents ? `${amount}¢` : `$${amount}`;
  const equation = `${first.price} + ${second.price} = ${total}`;

  return {
    key,
    context: priceList.map(item => `${item.name}: ${tag(item.price)}`),
    prompt: `Siti buys one ${first.name} and one ${second.name}. How much does she pay? Write a number sentence in ${unit}.`,
    unit,
    numberSentence: { numbers: [first.price, second.price], operation: '+', missingResult: true, chooseOperation: true, freeEntry: true },
    answer: equation,
    hint: 'Find the price beside each item Siti buys. How can you put those two amounts together?',
    workedSteps: [
      { text: 'Read the two price tags.', equation: `${first.name}: ${tag(first.price)}, ${second.name}: ${tag(second.price)}` },
      { text: 'Add the prices to find what Siti pays.', equation: `${tag(first.price)} + ${tag(second.price)} = ${tag(total)}` },
    ],
    explanation: `The ${first.name} costs ${tag(first.price)} and the ${second.name} costs ${tag(second.price)}. Together they cost ${tag(total)}.`,
  };
}
