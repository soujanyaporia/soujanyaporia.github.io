import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-fair-cash-tins',
  level: 3,
  title: 'Compare two cash tins after a payment',
  objective: 'Find the new difference after one tin pays out money, then use equal shares to find the amount in the other tin.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-reference-amount-and-its-multiple',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const blue = rng.int(82, 137);
  const redShares = rng.int(4, 6);
  const payment = rng.int(17, 39);
  const extraShares = redShares - 1;
  const finalGap = extraShares * blue;
  const startingGap = finalGap + payment;

  return {
    key,
    context: [
      `At the class fair, the red tin held $${startingGap} more than the blue tin.`,
      `Isha used $${payment} from the red tin to pay a baker. The money in the blue tin stayed the same.`,
      `The red tin then held ${redShares} times as much money as the blue tin.`,
    ],
    prompt: '(a) How much more money was in the red tin than in the blue tin after the payment?\n(b) How much money was in the blue tin?',
    unit: 'dollars',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Difference after the payment ($)',
      secondLabel: '(b) Money in the blue tin ($)',
    },
    answer: JSON.stringify([String(finalGap), String(blue)]),
    hint: 'Which tin did the payment come from? Think of the money in the blue tin as one share.',
    workedSteps: [
      {
        text: '(a) Isha took the payment from the red tin alone. The difference shrank by the amount she paid.',
        equation: `$${startingGap} − $${payment} = $${finalGap}`,
      },
      {
        text: `(b) The blue tin holds one share. The red tin now holds ${redShares} shares of the same size. Count the extra shares in the red tin.`,
        equation: `${redShares} − 1 = ${extraShares}`,
      },
      {
        text: `Together, the ${extraShares} extra shares are worth $${finalGap}. Divide to find the value of the blue tin’s one share.`,
        equation: `$${finalGap} ÷ ${extraShares} = $${blue}`,
      },
    ],
    explanation: `After the payment, the red tin held $${finalGap} more than the blue tin. That difference covers ${extraShares} equal shares, so the blue tin's one share was worth $${blue}.`,
  };
}
