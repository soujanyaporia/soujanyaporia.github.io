import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-successive-relative-price-purchases',
  level: 6,
  title: 'Two purchases with different prices',
  objective: 'Use fractions of a budget and relative prices to find a total item count or spending on one type of item.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P6.S.FRAC.02', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-successive-purchases-relative-prices',
};

type Plan = {
  a: number; b: number; c: number; d: number;
  cheapCount: number; dearCount: number; multiple: number;
};
type Steps = NonNullable<Question['workedSteps']>;
const firstFractions: [number, number][] = [[1, 3], [2, 5], [2, 7], [3, 8]];
const laterFractions: [number, number][] = [[1, 2], [2, 3], [3, 4], [2, 5]];
const plans: Plan[] = [];

// Enumerate a bounded set instead of retrying random draws indefinitely.
for (const [a, b] of firstFractions) {
  for (const [c, d] of laterFractions) {
    for (let cheapCount = 4; cheapCount <= 12; cheapCount++) {
      for (let dearCount = 2; dearCount <= 5; dearCount++) {
        for (let multiple = 2; multiple <= 4; multiple++) {
          const firstUnits = cheapCount + dearCount * multiple;
          if (firstUnits % a !== 0) continue;
          const startUnits = firstUnits / a * b;
          const remainingUnits = startUnits - firstUnits;
          const extraCount = remainingUnits * c / d;
          if (startUnits > 150 || !Number.isInteger(extraCount)) continue;
          if (extraCount < 2 || extraCount > 60 || cheapCount + extraCount > 80) continue;
          plans.push({ a, b, c, d, cheapCount, dearCount, multiple });
        }
      }
    }
  }
}

const items = [
  { cheap: 'pencil', cheapPlural: 'pencils', dear: 'notebook', dearPlural: 'notebooks' },
  { cheap: 'eraser', cheapPlural: 'erasers', dear: 'folder', dearPlural: 'folders' },
  { cheap: 'crayon', cheapPlural: 'crayons', dear: 'sketchbook', dearPlural: 'sketchbooks' },
];
const cash = (cents: number): string => (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const moneyVariant = ((hashString(`relative-price-mode:${seed}`) + (index | 0)) & 1) === 1;
  const { a, b, c, d, cheapCount, dearCount, multiple } = rng.pick(plans);
  const item = rng.pick(items);
  const name = rng.pick(['Nora', 'Mei', 'Aisha', 'Priya']);
  const firstUnits = cheapCount + dearCount * multiple;
  const startUnits = firstUnits / a * b;
  const remainingUnits = startUnits - firstUnits;
  const extraCount = remainingUnits / d * c;
  const totalCount = cheapCount + extraCount;
  const context = [
    `${name} uses ${a}/${b} of her starting money to buy ${cheapCount} ${item.cheapPlural} and ${dearCount} ${item.dearPlural}.`,
    `Each ${item.dear} costs ${multiple} times as much as each ${item.cheap}.`,
    `She then spends ${c}/${d} of the money she has left on more ${item.cheapPlural}, at the same price each.`,
  ];
  const finish = (prompt: string, answer: string, unit: string, hint: string, workedSteps: Steps): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
  });

  if (!moneyVariant) {
    return finish(
      `How many ${item.cheapPlural} does ${name} buy in the two purchases altogether?`,
      String(totalCount),
      item.cheapPlural,
      `Think of the price of one ${item.cheap} as one unit. Express the first purchase in these units, then follow the fractions.`,
      [
        {
          text: `One money unit is the price of one ${item.cheap}. Each ${item.dear} costs ${multiple} units. Find the units spent first.`,
          equation: `${cheapCount} + ${dearCount} × ${multiple} = ${firstUnits} units`,
        },
        {
          text: `These ${firstUnits} units are ${a}/${b} of the starting money. Find the starting number of units.`,
          equation: `${firstUnits} ÷ ${a} × ${b} = ${startUnits} units`,
        },
        {
          text: 'Find the money units left after the first purchase.',
          equation: `${startUnits} − ${firstUnits} = ${remainingUnits} units`,
        },
        {
          text: 'Find the money units used for the second purchase.',
          equation: `${remainingUnits} ÷ ${d} × ${c} = ${extraCount} units`,
        },
        {
          text: `Each extra ${item.cheap} costs one unit, so she buys ${extraCount} more. Add the two counts.`,
          equation: `${cheapCount} + ${extraCount} = ${totalCount} ${item.cheapPlural}`,
        },
      ],
    );
  }

  const priceCents = rng.pick([40, 50, 60, 75, 80, 90, 100, 120, 125, 150]);
  const remainingCents = remainingUnits * priceCents;
  const firstCents = firstUnits * priceCents;
  const laterCents = extraCount * priceCents;
  const leftCents = remainingCents - laterCents;
  const firstTargetCents = cheapCount * priceCents;
  const targetCents = firstTargetCents + laterCents;
  context.push(`After both purchases, she has $${cash(leftCents)} left.`);

  return finish(
    `How much does ${name} spend on ${item.cheapPlural} in the two purchases altogether?`,
    cash(targetCents),
    'dollars',
    'Work backwards from the final amount left. Use the relative prices to split the cost of the first purchase.',
    [
      {
        text: `After the second purchase, ${d - c}/${d} of the money remaining after the first purchase is left. Recover that earlier remainder.`,
        equation: `$${cash(leftCents)} ÷ ${d - c} × ${d} = $${cash(remainingCents)}`,
      },
      {
        text: `The first purchase used ${a}/${b} of the starting money and left ${b - a}/${b}. Find the first purchase's cost.`,
        equation: `$${cash(remainingCents)} ÷ ${b - a} × ${a} = $${cash(firstCents)}`,
      },
      {
        text: `Use the price of one ${item.cheap} as one unit. Express the first purchase in these units.`,
        equation: `${cheapCount} + ${dearCount} × ${multiple} = ${firstUnits} units`,
      },
      {
        text: `Find the price of one ${item.cheap}.`,
        equation: `$${cash(firstCents)} ÷ ${firstUnits} = $${cash(priceCents)}`,
      },
      {
        text: `Find the amount spent on ${item.cheapPlural} in the first purchase.`,
        equation: `${cheapCount} × $${cash(priceCents)} = $${cash(firstTargetCents)}`,
      },
      {
        text: `The second purchase contains only ${item.cheapPlural}. Find its cost.`,
        equation: `$${cash(remainingCents)} ÷ ${d} × ${c} = $${cash(laterCents)}`,
      },
      {
        text: `Add the amounts spent on ${item.cheapPlural} in both purchases.`,
        equation: `$${cash(firstTargetCents)} + $${cash(laterCents)} = $${cash(targetCents)}`,
      },
    ],
  );
}
