import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-even-list-product',
  level: 3,
  title: 'Multiply the even numbers',
  objective: 'Use the ones digits to find the even numbers in a list, then multiply them together.',
  skillIds: ['P2.S.WN.06', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-parity-filtered-calculation',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const hundreds = 100 * rng.int(3, 4);
  const tens = 10 * rng.int(1, 9);
  const ones = rng.pick([0, 2, 4, 6, 8]);
  const large = hundreds + tens + ones;
  const small = rng.pick([2, 6, 8]);
  const oddPool = Array.from({ length: 100 }, (_, i) => 301 + 2 * i);
  const largeOdds = rng.shuffle(oddPool).slice(0, 2);
  const smallOdd = rng.pick([1, 3, 5, 9]);
  const list = rng.shuffle([large, small, ...largeOdds, smallOdd]);

  const parts = [hundreds, tens, ones].filter(part => part > 0);
  const partialProducts = parts.map(part => part * small);
  const product = large * small;

  return {
    key,
    prompt: 'Find the even numbers in this list. What do you get when you multiply them together?',
    display: list.join(', '),
    answer: String(product),
    proof: { op: '*', a: large, b: small },
    hint: 'Look at the last digit of each number. Even numbers end in 0, 2, 4, 6 or 8.',
    workedSteps: [
      { text: `${large} ends in ${ones} and ${small} ends in ${small}. These are the two even numbers.` },
      { text: 'Split the larger number into place-value parts.', equation: `${large} = ${parts.join(' + ')}` },
      {
        text: `Multiply each part by ${small}.`,
        equation: parts.map((part, i) => `${part} × ${small} = ${partialProducts[i]}`).join(', '),
      },
      { text: 'Add the results to get the product.', equation: `${partialProducts.join(' + ')} = ${product}` },
    ],
    explanation: `The even numbers are ${large} and ${small}. Their product is ${large} × ${small} = ${product}.`,
  };
}
