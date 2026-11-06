import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-derived-purchase',
  level: 3,
  title: 'Money left after a purchase',
  objective: 'Find a missing price or share before working out change, or use the money left to work out another amount.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-purchase-with-a-derived-amount',
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const money = (cents: number) => '$' + dollars(cents);
type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const finish = (context: string[], prompt: string, hint: string, workedSteps: Step[], result: number, wrong?: number[]): Question => ({
    key, context, prompt, hint, workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '),
    ...(wrong ? {
      answer: money(result),
      choices: r.shuffle([...new Set([result, ...wrong])].slice(0, 4).map(money)),
    } : { answer: dollars(result), unit: 'dollars' }),
  });
  const variant = ((Math.trunc(seed) % 4 + Math.trunc(index) % 4) % 4 + 4) % 4;

  if (variant === 0) {
    const note = r.pick([5, 10]);
    const paid = note * 100;
    const small = 5 * r.int(14, note * 10 - 1);
    const extra = 5 * r.int(3, Math.min(30, small / 5 - 1));
    const large = small + extra;
    const change = paid - large;
    return finish([
      `A small sketchpad costs ${money(small)}. A large sketchpad costs ${money(extra)} more than the small one.`,
      `Meera buys just the large sketchpad. She pays with a $${note} note.`,
    ], 'How much change does Meera get?', 'Which sketchpad does Meera take to the till?', [
      { text: 'Add the extra cost to find the price of the large sketchpad.', equation: `${money(small)} + ${money(extra)} = ${money(large)}` },
      { text: 'Take that price from the value of the note.', equation: `${money(paid)} − ${money(large)} = ${money(change)}` },
    ], change, [large, paid - small, paid - extra, paid]);
  }

  if (variant === 1) {
    const children = r.int(2, 5);
    const share = 100 * r.int(7, 18);
    const total = children * share;
    const price = 100 * r.int(2, share / 100 - 1);
    const left = share - price;
    return finish([
      `${children} children share ${money(total)} equally. Lina is one of them.`,
      `Lina buys a badge for ${money(price)} using her share.`,
    ], 'How much of her share does Lina have left?', 'Find the amount for one child before paying for the badge.', [
      { text: 'Divide the money equally among all the children, including Lina.', equation: `${money(total)} ÷ ${children} = ${money(share)}` },
      { text: 'Subtract the badge price from Lina’s share.', equation: `${money(share)} − ${money(price)} = ${money(left)}` },
    ], left, [share, total - price, price, total]);
  }

  if (variant === 2) {
    const spent = 100 * r.int(18, 48);
    const gap = 100 * r.int(2, 15);
    const left = spent - gap;
    const start = spent + left;
    return finish([
      `Hana spends ${money(spent)} on a board game.`,
      `The money she has left is ${money(gap)} less than the price of the game.`,
    ], 'How much money did Hana have before she bought the game?', 'Find what Hana still has. What two amounts made up her starting money?', [
      { text: 'Hana has less left than she spent. Subtract the difference to find what is left.', equation: `${money(spent)} − ${money(gap)} = ${money(left)}` },
      { text: 'Put the money spent and the money left back together.', equation: `${money(spent)} + ${money(left)} = ${money(start)}` },
    ], start);
  }

  const start = 100 * r.int(12, 35);
  const price = 5 * r.int(25, 145);
  const left = start - price;
  const gap = 5 * r.int(1, Math.min(100, left / 5 - 1));
  const other = left - gap;
  return finish([
    `Ravi starts with ${money(start)} and buys a kite for ${money(price)}.`,
    `Jia has ${money(gap)} less than Ravi has after he buys the kite.`,
  ], 'How much money does Jia have?', 'Compare Jia’s money with what Ravi has now.', [
    { text: 'Take the kite price from Ravi’s starting money.', equation: `${money(start)} − ${money(price)} = ${money(left)}` },
    { text: 'Jia has less than this balance. Subtract the difference.', equation: `${money(left)} − ${money(gap)} = ${money(other)}` },
  ], other);
}
