import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p6-percentage-change-and-discount-rate',
  level: 6,
  title: 'Find percentage increases and discounts',
  objective: 'Recover starting quantities and prices, then calculate percentage increases or discounts.',
  skillIds: ['P6.S.PCT.01', 'P6.S.PCT.02', 'P5.S.PCT.03', 'P5.S.PCT.04'],
  canonicalPatternId: 'p6-percentage-change-and-discount-rate',
};

const money = (cents: number): string => `$${(cents / 100).toFixed(2)}`;
type Steps = NonNullable<Question['workedSteps']>;
type ResponseOptions = Pick<Question, 'unit' | 'structuredResponse'>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    steps: Steps,
    options: ResponseOptions = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...options,
  });

  if (variant === 0) {
    const usual = r.int(3, 18) * 2000;
    const rate = r.pick([5, 10, 15, 20, 25, 30, 35, 40]);
    const discount = usual * rate / 100;
    const paid = usual - discount;
    return make(
      [`A lunch bag was reduced by ${money(discount)}. Hana paid ${money(paid)} for it in the sale.`],
      'What was the percentage discount on the lunch bag?',
      String(rate),
      'Add the discount back to the amount paid. Compare the discount with this usual price.',
      [
        {
          text: 'The usual price includes both the amount paid and the amount taken off.',
          equation: `${money(paid)} + ${money(discount)} = ${money(usual)}`,
        },
        {
          text: 'Express the discount as a percentage of the usual price.',
          equation: `${money(discount)} ÷ ${money(usual)} × 100% = ${rate}%`,
        },
      ],
      {unit: '%'},
    );
  }

  if (variant === 1) {
    // Each row makes both original counts integral and leaves a multiple of 40 stars.
    const [starsLeftPercent, heartsLeftPercent, starUnit] = r.pick([
      [40, 25, 100],
      [60, 50, 200],
      [50, 60, 240],
      [30, 50, 400],
      [75, 50, 320],
    ]);
    const initialStars = starUnit * r.int(1, 2);
    const used = initialStars * (100 - starsLeftPercent) / 100;
    const initialHearts = used * 100 / (100 - heartsLeftPercent);
    const remainingStars = initialStars - used;
    const increaseRate = r.pick([12.5, 25, 37.5, 50, 62.5, 75].filter(
      rate => remainingStars * (100 + rate) < initialStars * 100,
    ));
    const added = remainingStars * increaseRate / 100;
    const finalStars = remainingStars + added;
    return make(
      [
        `For an art session, Leela set out ${initialStars} paper stars and some paper hearts.`,
        'The children used the same number of stars as hearts.',
        `${starsLeftPercent}% of the stars and ${heartsLeftPercent}% of the hearts were left.`,
        `Leela then added only paper stars, bringing the number of stars to ${finalStars}.`,
      ],
      '(a) How many paper hearts were there at first? (b) What was the percentage increase in the number of stars when more were added? Compare with the number left just before the addition.',
      JSON.stringify([String(initialHearts), String(increaseRate)]),
      'Use the equal numbers used to find the original number of hearts. For the increase, the stars left just before the addition represent 100%.',
      [
        {
          text: `Find the stars used. Their percentage is 100% − ${starsLeftPercent}%.`,
          equation: `${initialStars} × ${100 - starsLeftPercent}/100 = ${used}`,
        },
        {
          text: 'The same number of hearts were used. Find the percentage of hearts used.',
          equation: `100% − ${heartsLeftPercent}% = ${100 - heartsLeftPercent}%`,
        },
        {
          text: '(a) Recover the original number of hearts.',
          equation: `${used} ÷ ${100 - heartsLeftPercent} × 100 = ${initialHearts} hearts`,
        },
        {
          text: 'Find the stars left just before the addition. This is the base for the increase.',
          equation: `${initialStars} − ${used} = ${remainingStars} stars`,
        },
        {
          text: 'Find how many stars were added.',
          equation: `${finalStars} − ${remainingStars} = ${added} stars`,
        },
        {
          text: '(b) Compare the addition with the number left before it.',
          equation: `${added} ÷ ${remainingStars} × 100% = ${increaseRate}%`,
        },
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Paper hearts at first'},
            {label: '(b) Increase (%)', decimal: true},
          ],
        },
      },
    );
  }

  // All prices are calculated in cents. The laptop sale price always exceeds the tablet sale price.
  const tabletUsual = r.int(12, 30) * 2000;
  const tabletRate = r.pick([10, 15, 20, 25, 30, 35, 40]);
  const laptopUsual = r.int(50, 80) * 2000 + r.pick([0, 250, 500, 750]);
  const laptopRate = r.pick([10, 20, 30]);
  const tabletSale = tabletUsual * (100 - tabletRate) / 100;
  const laptopSale = laptopUsual * (100 - laptopRate) / 100;
  const total = tabletSale + laptopSale;
  const difference = laptopSale - tabletSale;
  const tabletDiscount = tabletUsual - tabletSale;
  return make(
    [
      `At a shop sale, Farah paid ${money(total)} altogether for a tablet and a laptop.`,
      `The laptop cost ${money(difference)} more than the tablet after both discounts.`,
      `The tablet usually cost ${money(tabletUsual)}. The laptop was sold at ${laptopRate}% off its usual price.`,
    ],
    '(a) What was the percentage discount on the tablet? (b) What was the usual price of the laptop?',
    JSON.stringify([String(tabletRate), (laptopUsual / 100).toFixed(2)]),
    'Subtract the difference from the total and halve the result to find the tablet sale price. Use each item’s own usual price as 100%.',
    [
      {
        text: 'Removing the price difference leaves twice the tablet sale price.',
        equation: `(${money(total)} − ${money(difference)}) ÷ 2 = ${money(tabletSale)}`,
      },
      {
        text: 'Find the discount amount on the tablet.',
        equation: `${money(tabletUsual)} − ${money(tabletSale)} = ${money(tabletDiscount)}`,
      },
      {
        text: '(a) Compare the tablet discount with its usual price.',
        equation: `${money(tabletDiscount)} ÷ ${money(tabletUsual)} × 100% = ${tabletRate}%`,
      },
      {
        text: 'Find the laptop sale price from the total.',
        equation: `${money(total)} − ${money(tabletSale)} = ${money(laptopSale)}`,
      },
      {
        text: 'Find the percentage of the laptop usual price that was paid.',
        equation: `100% − ${laptopRate}% = ${100 - laptopRate}%`,
      },
      {
        text: '(b) Recover 100% of the laptop usual price.',
        equation: `${money(laptopSale)} ÷ ${100 - laptopRate} × 100 = ${money(laptopUsual)}`,
      },
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Tablet discount (%)'},
          {label: '(b) Laptop usual price (dollars)', decimal: true},
        ],
      },
    },
  );
}
