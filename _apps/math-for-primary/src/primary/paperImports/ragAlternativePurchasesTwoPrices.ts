import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-alternative-purchases-two-prices',
  level: 5,
  title: 'Compare two extra purchases',
  objective: 'Use a shortfall and a leftover to find a price difference, work out unit prices and recover starting money.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-alternative-purchases-two-prices',
};

const cash = (cents: number): string => (cents / 100).toFixed(2);

const GOODS = [
  {higher: 'paintbrush', higherPlural: 'paintbrushes', lower: 'pencil', lowerPlural: 'pencils'},
  {higher: 'sketch pad', higherPlural: 'sketch pads', lower: 'eraser', lowerPlural: 'erasers'},
  {higher: 'glue stick', higherPlural: 'glue sticks', lower: 'ruler', lowerPlural: 'rulers'},
];

// Small counts keep the equal-cost replacement division within one-digit divisors.
const COUNTS = [[2, 3], [2, 4], [3, 4], [4, 3], [4, 4], [4, 5]];

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  // 0: difference and funds; 1: hypothetical price and funds; 2: actual price and funds.
  const variant = r.int(0, 2);
  const goods = r.pick(GOODS);
  const name = r.pick(['Kai', 'Lila', 'Amir', 'Priya']);
  const [higherCount, lowerCount] = r.pick(COUNTS);

  // Construct in whole cents so every visible amount and every solution is exact.
  const lowerPrice = r.int(12, 47) * 5;
  const shortfall = r.pick([15, 25, 35, 45, 55, 65, 75, 85]);
  const leftover = r.pick([25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125]);
  const difference = shortfall + leftover;
  const higherPrice = lowerPrice + difference;
  const totalCost = higherCount * higherPrice + lowerCount * lowerPrice;
  const remaining = lowerPrice + leftover;
  const initial = totalCost + remaining;
  const itemCount = higherCount + lowerCount;
  const equalCostTotal = totalCost - higherCount * difference;

  const context = [
    `At a craft shop, ${name} pays $${cash(totalCost)} for ${higherCount} ${goods.higherPlural} and ${lowerCount} ${goods.lowerPlural}.`,
    `All ${goods.higherPlural} have the same price, and all ${goods.lowerPlural} have the same price. These prices stay unchanged.`,
    `After paying for these items, ${name} is $${cash(shortfall)} short of buying one more ${goods.higher}.`,
    variant === 1
      ? `With that same money, if ${name} buys one more ${goods.lower} instead, ${name} would have $${cash(leftover)} left.`
      : `With that money, ${name} buys one more ${goods.lower} instead and has $${cash(leftover)} left.`,
  ];

  const firstPrompt = variant === 0
    ? `(a) How much more does one ${goods.higher} cost than one ${goods.lower}?`
    : `(a) What is the price of one ${goods.higher}?`;
  const firstAnswer = variant === 0 ? difference : higherPrice;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Both choices use the same remaining money. Add the shortfall for one ${goods.higher} to the amount left after buying one ${goods.lower} to find the price difference.`,
      equation: `$${cash(shortfall)} + $${cash(leftover)} = $${cash(difference)}`,
    },
    {
      text: `Replace each of the ${higherCount} ${goods.higherPlural} in the first purchase with a ${goods.lower}. Remove ${higherCount} price differences. The new total pays for ${itemCount} ${goods.lowerPlural}.`,
      equation: `$${cash(totalCost)} − ${higherCount} × $${cash(difference)} = $${cash(equalCostTotal)}`,
    },
    {
      text: `Divide equally to find the price of one ${goods.lower}.`,
      equation: `$${cash(equalCostTotal)} ÷ ${itemCount} = $${cash(lowerPrice)}`,
    },
    {
      text: `Add the price difference to find the price of one ${goods.higher}.`,
      equation: `$${cash(lowerPrice)} + $${cash(difference)} = $${cash(higherPrice)}`,
    },
    {
      text: `Before the extra purchase, ${name} had the price of one ${goods.higher} minus the shortfall.`,
      equation: `$${cash(higherPrice)} − $${cash(shortfall)} = $${cash(remaining)}`,
    },
    {
      text: 'Add the cost of the first purchase to the money remaining immediately after it.',
      equation: `$${cash(totalCost)} + $${cash(remaining)} = $${cash(initial)}`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt: `${firstPrompt} (b) How much money did ${name} have before buying anything? Give both amounts in dollars.`,
    answer: JSON.stringify([cash(firstAnswer), cash(initial)]),
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: variant === 0 ? '(a) Price difference ($)' : `(a) Price of one ${goods.higher} ($)`,
      secondLabel: '(b) Money at first ($)',
      decimal: true,
    },
    hint: 'Compare the two choices using the same remaining money. What do the shortfall and leftover tell you about the difference between the prices?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
  };
}
