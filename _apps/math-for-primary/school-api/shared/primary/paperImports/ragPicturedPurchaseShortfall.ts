import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-pictured-purchase-shortfall',
  level: 1 as const,
  title: 'How much more money is needed?',
  objective: 'Count the pictured coins and find how many more cents are needed to pay the price.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-find-a-purchase-shortfall',
};

function coinPicture(coins: number[]): Batch11UpperPicture {
  const marks: Batch11UpperPicture['marks'] = [];
  coins.forEach((coin, i) => {
    const row = Math.floor(i / 3);
    const rowLength = Math.min(3, coins.length - row * 3);
    const x = 160 + ((i % 3) - (rowLength - 1) / 2) * 78;
    const y = coins.length <= 3 ? 100 : 60 + row * 80;
    const face = `${coin}¢`;
    marks.push({ kind: 'circle', cx: x, cy: y, r: 27, fill: '#fff4d5' });
    marks.push({ kind: 'text', x: x - 5 * face.length, y: y + 6, text: face });
  });
  return { type: 'batch11-upper', marks, label: `Coins: ${coins.map(coin => `${coin}¢`).join(', ')}.` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  // Three distinct denominations total at most 80¢. The extra coins add at most 15¢.
  const pieces = rng.shuffle([5, 10, 20, 50]).slice(0, rng.int(2, 3));
  pieces.push(rng.pick([5, 10]));
  if (rng.chance(0.5)) pieces.push(5);
  const coins = rng.shuffle(pieces);
  const balance = coins.reduce((sum, coin) => sum + coin, 0);
  const price = 5 * rng.int(balance / 5 + 1, 20);
  const priceTag = price === 100 ? '$1' : `${price}¢`;
  const gap = price - balance;
  const item = rng.pick(['pencil', 'sticker', 'bookmark', 'eraser']);
  const name = rng.pick(['Kai', 'Mira', 'Siti', 'Ben']);
  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `Count all of ${name}’s coins.`, equation: `${coins.map(coin => `${coin}¢`).join(' + ')} = ${balance}¢` },
  ];
  if (price === 100) {
    workedSteps.push({ text: 'Write the price in cents to match the coins.', equation: '$1 = 100¢' });
  }
  workedSteps.push({ text: 'Take the money already saved away from the price.', equation: `${price}¢ − ${balance}¢ = ${gap}¢` });
  return {
    key,
    context: [`The ${item} costs ${priceTag}.`, `These coins are all the money ${name} has.`],
    picture: coinPicture(coins),
    prompt: `How many more cents does ${name} need to buy the ${item}?`,
    answer: String(gap),
    unit: 'cents',
    hint: 'Read the value on each coin. Count on from their total to the price.',
    workedSteps,
    explanation: `${name} has ${balance}¢. With ${gap}¢ more, ${name} will have the full ${price}¢.`,
    proof: { op: '-', a: price, b: balance },
  };
}
