import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-alternative-quantities-one-price',
  level: 5,
  title: 'Compare shopping plans',
  objective: 'Use purchase quantities, money left and shortfalls to find prices and starting money.',
  skillIds: ['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06'],
  canonicalPatternId: 'p5-alternative-quantities-one-price',
};

const cash = (cents: number): string => (cents / 100).toFixed(2);
type Step = {text: string; equation: string};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const mode = ((hashString(`shopping-mode:${seed}`) >>> 0) + (index >>> 0)) % 4;
  const make = (
    context: string[], prompt: string, answer: string,
    hint: string, workedSteps: Step[], extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    ...extra,
  });

  if (mode === 0 || mode === 3) {
    const bought = r.int(6, 18);
    const extraCount = r.int(3, 9);
    const wanted = bought + extraCount;
    const price = r.int(15, 65) * 5;
    const difference = extraCount * price;
    const left = r.int(1, difference / 5 - 1) * 5;
    const short = difference - left;
    const initial = bought * price + left;
    const steps: Step[] = [
      {
        text: 'Find how many more notebooks are in the larger plan.',
        equation: `${wanted} − ${bought} = ${extraCount}`,
      },
      {
        text: 'The leftover money and the shortfall together pay for those extra notebooks.',
        equation: `$${cash(left)} + $${cash(short)} = $${cash(difference)}`,
      },
      {
        text: 'Divide by the extra number of notebooks to find the price of one.',
        equation: `$${cash(difference)} ÷ ${extraCount} = $${cash(price)}`,
      },
    ];
    if (mode === 3) {
      steps.push({
        text: 'Add the money left to the cost of the smaller purchase.',
        equation: `${bought} × $${cash(price)} + $${cash(left)} = $${cash(initial)}`,
      });
    }
    return make(
      [
        'Amina has some money for notebooks. Every notebook has the same price.',
        `She needs $${cash(short)} more to pay for ${wanted} notebooks.`,
        `If she buys ${bought} notebooks instead, she will have $${cash(left)} left.`,
      ],
      mode === 0 ? 'What is the price of one notebook?' : 'How much money does Amina have before buying any notebooks?',
      cash(mode === 0 ? price : initial),
      'Compare the two quantities. The money left and the money missing together cover the extra notebooks.',
      steps,
      {unit: 'dollars'},
    );
  }

  if (mode === 1) {
    const metresPerGroup = r.pick([2, 3, 4, 6, 8]);
    const pricePerMetre = r.int(16, 39) * 5;
    const groupPrice = metresPerGroup * pricePerMetre;
    const boughtGroups = r.int(2, 4);
    const extraGroups = r.int(2, 5);
    const targetGroups = boughtGroups + extraGroups;
    const boughtMetres = boughtGroups * metresPerGroup;
    const targetMetres = targetGroups * metresPerGroup;
    const extraCost = extraGroups * groupPrice;
    const left = r.int(1, extraCost / 5 - 1) * 5;
    const boughtCost = boughtGroups * groupPrice;
    const initial = boughtCost + left;
    const targetCost = targetGroups * groupPrice;
    const short = targetCost - initial;
    return make(
      [
        `A shop charges $${cash(groupPrice)} for every ${metresPerGroup} m of cord. The price per metre stays the same.`,
        `Farah buys ${boughtMetres} m of cord and has $${cash(left)} left.`,
      ],
      `How much extra money would Farah have needed to buy ${targetMetres} m of cord in total with her original money?`,
      cash(short),
      'Find her original money from the smaller purchase, then compare it with the cost of the total length she wants.',
      [
        {
          text: 'Find the price of one metre.',
          equation: `$${cash(groupPrice)} ÷ ${metresPerGroup} = $${cash(pricePerMetre)}`,
        },
        {
          text: 'Count the equal lengths in the smaller purchase.',
          equation: `${boughtMetres} ÷ ${metresPerGroup} = ${boughtGroups}`,
        },
        {
          text: 'Find the cost of that purchase.',
          equation: `${boughtGroups} × $${cash(groupPrice)} = $${cash(boughtCost)}`,
        },
        {
          text: 'Add the money left to find her original money.',
          equation: `$${cash(boughtCost)} + $${cash(left)} = $${cash(initial)}`,
        },
        {
          text: `The total length contains ${targetMetres} ÷ ${metresPerGroup} = ${targetGroups} equal lengths. Find their cost.`,
          equation: `${targetGroups} × $${cash(groupPrice)} = $${cash(targetCost)}`,
        },
        {
          text: 'Subtract her original money from the cost of the larger purchase.',
          equation: `$${cash(targetCost)} − $${cash(initial)} = $${cash(short)}`,
        },
      ],
      {unit: 'dollars'},
    );
  }

  const largeCount = r.pick([2, 4]);
  const smallCount = r.int(2, 9 - largeCount);
  const smallPrice = r.int(18, 55) * 5;
  const short = r.int(3, 17) * 5;
  const left = r.int(6, 25) * 5;
  const priceDifference = short + left;
  const largePrice = smallPrice + priceDifference;
  const total = largeCount * largePrice + smallCount * smallPrice;
  const remaining = smallPrice + left;
  const initial = total + remaining;
  const count = largeCount + smallCount;
  const extraForLarge = largeCount * priceDifference;
  const allSmallCost = total - extraForLarge;
  return make(
    [
      'At a craft shop, every large sketchbook has the same price, and every small sketchbook has the same price.',
      `Leela pays $${cash(total)} for ${largeCount} large sketchbooks and ${smallCount} small sketchbooks.`,
      `After this purchase, she needs $${cash(short)} more to afford one more large sketchbook.`,
      `She buys one more small sketchbook instead and has $${cash(left)} left.`,
    ],
    '(a) How much more does one large sketchbook cost than one small sketchbook? (b) How much money did Leela have before her first purchase?',
    JSON.stringify([cash(priceDifference), cash(initial)]),
    'Compare the prices with the same remaining money. Then work out what the first purchase would cost if every sketchbook were small.',
    [
      {
        text: '(a) The large sketchbook costs more than the remaining money, while the small one costs less. Add these two differences.',
        equation: `$${cash(short)} + $${cash(left)} = $${cash(priceDifference)}`,
      },
      {
        text: `(b) Find the extra cost of the ${largeCount} large sketchbooks compared with the same number of small ones.`,
        equation: `${largeCount} × $${cash(priceDifference)} = $${cash(extraForLarge)}`,
      },
      {
        text: `Remove that extra cost. The result is the cost of ${largeCount} + ${smallCount} = ${count} small sketchbooks.`,
        equation: `$${cash(total)} − $${cash(extraForLarge)} = $${cash(allSmallCost)}`,
      },
      {
        text: 'Find the price of one small sketchbook.',
        equation: `$${cash(allSmallCost)} ÷ ${count} = $${cash(smallPrice)}`,
      },
      {
        text: 'Put back the price of the last small sketchbook to find the money remaining after the first purchase.',
        equation: `$${cash(smallPrice)} + $${cash(left)} = $${cash(remaining)}`,
      },
      {
        text: 'Add the cost of the first purchase to find the starting money.',
        equation: `$${cash(total)} + $${cash(remaining)} = $${cash(initial)}`,
      },
    ],
    {
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Price difference ($)',
        secondLabel: '(b) Money at first ($)',
        decimal: true,
      },
    },
  );
}
