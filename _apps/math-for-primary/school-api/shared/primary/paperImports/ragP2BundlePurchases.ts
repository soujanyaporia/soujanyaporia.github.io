import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-bundle-purchases',
  level: 2,
  title: 'Shopping by the pack',
  objective: 'Use two pack prices to find the total spent or the money left.',
  skillIds: ['P2.S.MD.02', 'P2.S.MD.01', 'P2.S.AS.01', 'P2.S.MONEY.04'],
  canonicalPatternId: 'p2-multiple-purchases-at-bundle-prices',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const askForBalance = (seed + index) % 2 === 0;

  const stickersPerPack = rng.pick([4, 5]);
  const pensPerPack = rng.pick([2, 3]);
  const stickerPrice = rng.pick([2, 3]);
  const penPrice = rng.pick([4, 5]);
  const stickerPacks = rng.int(1, 4);
  const penPacks = rng.int(2, 4);
  const stickers = stickerPacks * stickersPerPack;
  const pens = penPacks * pensPerPack;
  const stickerCost = stickerPacks * stickerPrice;
  const penCost = penPacks * penPrice;
  const total = stickerCost + penCost;

  const context = [
    `A pack of ${stickersPerPack} stickers costs $${stickerPrice}.`,
    `A pack of ${pensPerPack} pens costs $${penPrice}.`,
  ];
  const workedSteps = [
    { text: 'Count the packs of stickers.', equation: `${stickers} ÷ ${stickersPerPack} = ${stickerPacks}` },
    { text: 'Find the cost of the stickers.', equation: `${stickerPacks} × $${stickerPrice} = $${stickerCost}` },
    { text: 'Count the packs of pens.', equation: `${pens} ÷ ${pensPerPack} = ${penPacks}` },
    { text: 'Find the cost of the pens.', equation: `${penPacks} × $${penPrice} = $${penCost}` },
    { text: 'Add the two costs.', equation: `$${stickerCost} + $${penCost} = $${total}` },
  ];
  let prompt = 'How much does Siti spend altogether?';
  let answer = total;
  let explanation = `Siti spends $${stickerCost} on stickers and $${penCost} on pens. That makes $${total} altogether.`;
  if (askForBalance) {
    const opening = rng.pick([20, 30, 40, 50].filter(amount => amount > total));
    context.push(`Siti starts with $${opening}.`);
    prompt = 'How much money does Siti have left after shopping?';
    answer = opening - total;
    workedSteps.push({ text: 'Take the cost of both purchases away from her starting money.', equation: `$${opening} − $${total} = $${answer}` });
    explanation += ` She has $${answer} left from her $${opening}.`;
  }
  context.push(`Siti buys ${stickers} stickers and ${pens} pens in full packs.`);

  return {
    key, context, prompt, answer: String(answer), unit: 'dollars',
    hint: 'How many packs of each kind does Siti buy? Use the price of one pack to find what she spends on each kind.',
    workedSteps, explanation,
  };
}
