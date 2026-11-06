import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-same-unit-price-total',
  level: 3,
  title: 'Add two prices',
  objective: 'Add two prices in dollars and cents and, when asked, find how much more one item costs.',
  skillIds: ['P3.S.MONEY.01'],
  canonicalPatternId: 'price-totals-and-missing-parts',
};

const dollars = (cents: number) => (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const [firstItem, secondItem] = rng.pick([
    ['backpack', 'lunch bag'],
    ['board game', 'jigsaw puzzle'],
    ['tennis racket', 'tube of tennis balls'],
  ]);
  const first = rng.int(41, 57) * 100 + 5 * rng.int(1, 19);
  const second = rng.int(12, 22) * 100 + 5 * rng.int(1, 19);
  const compare = rng.chance(0.4);
  const total = dollars(first + second);
  const difference = dollars(first - second);
  const firstPrice = `$${dollars(first)}`;
  const secondPrice = `$${dollars(second)}`;
  const centSum = first % 100 + second % 100;
  const totalPrompt = 'How much does Mina spend on the two items?';
  const steps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Add the cents in the two prices.',
      equation: `${first % 100}¢ + ${second % 100}¢ = ${centSum}¢`,
    },
    {
      text: centSum >= 100
        ? 'Exchange 100 cents for one dollar. Include that dollar when you add the prices.'
        : 'Add the dollars and include the cents to get the total.',
      equation: `${firstPrice} + ${secondPrice} = $${total}`,
    },
  ];
  if (compare) {
    steps.push({
      text: `To see how much more the ${firstItem} costs, subtract the price of the ${secondItem} from its price.`,
      equation: `${firstPrice} − ${secondPrice} = $${difference}`,
    });
  }

  return {
    key,
    context: [
      `Mina buys one ${firstItem} and one ${secondItem}.`,
      `A ${firstItem} costs ${firstPrice}.`,
      `A ${secondItem} costs ${secondPrice}.`,
    ],
    prompt: compare
      ? `(a) ${totalPrompt}\n(b) How much more does the ${firstItem} cost than the ${secondItem}?`
      : totalPrompt,
    answer: compare ? JSON.stringify([total, difference]) : total,
    unit: 'dollars',
    ...(compare ? { structuredResponse: {
      kind: 'number-pair' as const,
      firstLabel: '(a) Total spent ($)',
      secondLabel: '(b) Price difference ($)',
      decimal: true,
    } } : {}),
    hint: compare
      ? 'Line up the decimal points. Add the prices for (a). For (b), start with the higher price.'
      : 'Line up the decimal points so that you add cents to cents and dollars to dollars.',
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
