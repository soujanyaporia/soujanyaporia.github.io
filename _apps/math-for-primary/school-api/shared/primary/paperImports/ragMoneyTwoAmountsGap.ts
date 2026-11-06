import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-money-two-amounts-gap',
  level: 3,
  title: 'Find the cost of both items',
  objective: 'Use a price difference to find the dearer item’s price, then add both prices.',
  skillIds: ['P3.S.MONEY.01'],
  canonicalPatternId: 'p3-money-two-amounts-separated-by-a-gap',
};

const money = (cents: number) => '$' + (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const helmet = rng.int(14, 38) * 100 + rng.int(1, 19) * 5;
  const gap = rng.int(6, 26) * 100 + rng.pick([15, 35, 55, 75, 95]);
  const scooter = helmet + gap;
  const total = helmet + scooter;

  return {
    key,
    context: [
      `A helmet costs ${money(helmet)}.`,
      `A scooter costs ${money(gap)} more than the helmet.`,
    ],
    prompt: 'How much would one helmet and one scooter cost together? Show your working.',
    unit: 'dollars',
    answer: (total / 100).toFixed(2),
    hint: 'Start with the helmet price. What must you add to it to find the scooter price?',
    workedSteps: [
      { text: 'Add the extra cost to the helmet price to find the scooter price.', equation: `${money(helmet)} + ${money(gap)} = ${money(scooter)}` },
      { text: 'Add the price of one helmet and the price of one scooter.', equation: `${money(helmet)} + ${money(scooter)} = ${money(total)}` },
    ],
    explanation: `The scooter costs ${money(scooter)}. Buying it along with the ${money(helmet)} helmet costs ${money(total)} in all.`,
  };
}
