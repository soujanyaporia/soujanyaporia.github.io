import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-two-type-count',
  level: 2,
  title: 'How many cards are blue?',
  objective: 'Use the card count and the dot total to find how many cards carry fewer dots.',
  skillIds: ['P2.S.MD.01', 'P2.S.AS.01', 'P2.S.MD.02'],
  canonicalPatternId: 'p2-two-types-with-a-known-combined-count',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const cardCount = rng.int(8, 10);
  const blueDots = rng.int(2, 3);
  const difference = rng.int(1, 2);
  const goldDots = blueDots + difference;
  const blueCount = rng.int(1, cardCount - 1);
  const goldCount = cardCount - blueCount;
  const totalDots = blueCount * blueDots + goldCount * goldDots;
  const allGoldDots = cardCount * goldDots;
  const extraDots = allGoldDots - totalDots;

  return {
    key,
    context: [
      `Lina has ${cardCount} cards. Each card is either blue or gold.`,
      `Each blue card has ${blueDots} dots. Each gold card has ${goldDots} dots.`,
      `There are ${totalDots} dots on the cards altogether.`,
    ],
    prompt: 'How many blue cards does Lina have?',
    answer: String(blueCount),
    unit: 'blue cards',
    hint: 'Imagine that all the cards are gold. How many extra dots would you count?',
    workedSteps: [
      { text: 'Count the dots you would see if every card were gold.', equation: `${cardCount} × ${goldDots} = ${allGoldDots}` },
      { text: 'Compare that with the number of dots Lina has.', equation: `${allGoldDots} − ${totalDots} = ${extraDots}` },
      { text: 'Find how many fewer dots one blue card has than one gold card.', equation: `${goldDots} − ${blueDots} = ${difference}` },
      { text: 'Divide the extra dots by the difference for one card to count the blue cards.', equation: `${extraDots} ÷ ${difference} = ${blueCount}` },
    ],
    explanation: `Each time you swap one gold card for one blue card, the dot count drops by ${difference}. It takes ${blueCount} ${blueCount === 1 ? 'swap' : 'swaps'} to go from ${allGoldDots} dots to ${totalDots} dots.`,
    proof: {
      op: '/',
      a: { op: '-', a: { op: '*', a: cardCount, b: goldDots }, b: totalDots },
      b: { op: '-', a: goldDots, b: blueDots },
    },
  };
}
