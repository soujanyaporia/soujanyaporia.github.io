import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-quantity-difference',
  level: 6,
  title: 'Find quantities from a difference',
  objective: 'Use the difference between ratio parts to find one part and then a quantity or total.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.03', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-scaling-from-quantity-difference',
};

const PAIRS: [number, number][] = [
  [2, 5], [3, 7], [4, 9], [5, 8], [5, 9], [7, 10],
];

// Counts for three item types, followed by two relative-price multipliers.
// Each template gives greater spending on the first type than the third.
const COST_CASES: [number, number, number, number, number][] = [
  [2, 3, 7, 2, 5],
  [4, 5, 6, 3, 5],
  [5, 6, 7, 2, 3],
  [6, 5, 9, 3, 4],
  [3, 5, 7, 2, 5],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function fraction(n: number, d: number): string {
  const divisor = gcd(n, d);
  return `${n / divisor}/${d / divisor}`;
}

const mod4 = (n: number): number => ((n % 4) + 4) % 4;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (mod4(hashString(`${RAG_PATTERN.id}:${seed}`)) + mod4(index)) % 4;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    steps: string[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    explanation: steps.join(' '),
    workedSteps: steps.map(text => ({text})),
    ...extra,
  });

  if (variant === 0) {
    const [a, b] = r.pick(PAIRS);
    const one = r.int(6, 24);
    const difference = (b - a) * one;
    const total = (a + b) * one;
    return make(
      [
        'A reading club has only comic books and storybooks.',
        `The ratio of comic books to storybooks is ${a} : ${b}.`,
        `There are ${difference} more storybooks than comic books.`,
      ],
      'How many books does the club have altogether?',
      String(total),
      'Find how many ratio parts represent the extra storybooks. Then find one part.',
      [
        `The difference is ${b} − ${a} = ${b - a} equal parts.`,
        `One part represents ${difference} ÷ ${b - a} = ${one} books.`,
        `There are ${a} + ${b} = ${a + b} parts altogether.`,
        `The total is ${a + b} × ${one} = ${total} books.`,
      ],
      {unit: 'books'},
    );
  }

  if (variant === 1) {
    const [a, b] = r.pick(PAIRS);
    const one = r.int(6, 24);
    const extraAboveBlue = r.int(4, 25);
    const difference = (b - a) * one;
    const extraAboveRed = extraAboveBlue + difference;
    const blue = b * one;
    return make(
      [
        'A craft tray holds red, blue and yellow beads.',
        `The ratio of red beads to blue beads is ${a} : ${b}.`,
        `There are ${extraAboveRed} more yellow beads than red beads.`,
        `There are ${extraAboveBlue} more yellow beads than blue beads.`,
      ],
      'How many blue beads are in the tray?',
      String(blue),
      'Both comparisons use the same yellow beads. Subtract the two extra amounts to compare blue with red.',
      [
        `Yellow exceeds red by more than it exceeds blue, so there are more blue beads than red beads.`,
        `The difference between blue and red is ${extraAboveRed} − ${extraAboveBlue} = ${difference} beads.`,
        `This difference represents ${b} − ${a} = ${b - a} equal parts.`,
        `One part represents ${difference} ÷ ${b - a} = ${one} beads.`,
        `There are ${b} × ${one} = ${blue} blue beads.`,
      ],
      {unit: 'beads'},
    );
  }

  if (variant === 2) {
    const [notebooks, pens, rulers, penMultiplier, rulerMultiplier] = r.pick(COST_CASES);
    const countTotal = notebooks + pens + rulers;
    const commonPrice = penMultiplier * rulerMultiplier / gcd(penMultiplier, rulerMultiplier);
    const priceParts = [commonPrice, commonPrice / penMultiplier, commonPrice / rulerMultiplier];
    const products = [notebooks * priceParts[0], pens * priceParts[1], rulers * priceParts[2]];
    const divisor = gcd(products[0], gcd(products[1], products[2]));
    const spending = products.map(value => value / divisor);
    const [first, second, third] = spending;
    const dollarsPerPart = r.int(2, 12);
    const gap = first - third;
    const difference = gap * dollarsPerPart;
    const sum = first + second + third;
    const total = sum * dollarsPerPart;
    return make(
      [
        'A school orders only notebooks, pens and rulers.',
        `${fraction(notebooks, countTotal)} of the items are notebooks and ${fraction(pens, countTotal)} are pens. The rest are rulers.`,
        `One notebook costs ${penMultiplier} times the price of one pen and ${rulerMultiplier} times the price of one ruler.`,
        `The school spends $${difference.toFixed(2)} more on notebooks than on rulers.`,
      ],
      '(a) Give the ratio of the amounts spent on notebooks, pens and rulers, in that order, in simplest form. (b) How much does the order cost altogether?',
      JSON.stringify([String(first), String(second), String(third), total.toFixed(2)]),
      'Multiply each item-count ratio term by its price ratio term. Then use the difference between the first and third spending amounts.',
      [
        `Using denominator ${countTotal}, the fractions for notebooks and pens are ${notebooks}/${countTotal} and ${pens}/${countTotal}.`,
        `Rulers make up 1 − ${notebooks}/${countTotal} − ${pens}/${countTotal} = ${rulers}/${countTotal} of the items. The numbers of items are in the ratio ${notebooks} : ${pens} : ${rulers}.`,
        `Use ${commonPrice} price units for a notebook. A pen then costs ${commonPrice} ÷ ${penMultiplier} = ${priceParts[1]} units and a ruler costs ${commonPrice} ÷ ${rulerMultiplier} = ${priceParts[2]} units.`,
        `Multiply count parts by price parts: ${notebooks} × ${priceParts[0]} : ${pens} × ${priceParts[1]} : ${rulers} × ${priceParts[2]} = ${products.join(' : ')}.`,
        `(a) The spending ratio in simplest form is ${spending.join(' : ')}.`,
        `The spending difference represents ${first} − ${third} = ${gap} equal parts. One spending part is $${difference.toFixed(2)} ÷ ${gap} = $${dollarsPerPart.toFixed(2)}.`,
        `(b) There are ${first} + ${second} + ${third} = ${sum} spending parts. The order costs ${sum} × $${dollarsPerPart.toFixed(2)} = $${total.toFixed(2)}.`,
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Notebooks: ratio term'},
            {label: '(a) Pens: ratio term'},
            {label: '(a) Rulers: ratio term'},
            {label: '(b) Total cost in dollars', decimal: true},
          ],
        },
      },
    );
  }

  const [a, b] = r.pick(PAIRS);
  const one = r.int(6, 24);
  const smallerBag = a * one;
  const largerBag = b * one;
  const difference = largerBag - smallerBag;
  const purple = smallerBag + largerBag;
  const total = purple * 2;
  return make(
    [
      'A tub starts with equal numbers of green and purple counters.',
      'All the purple counters are put into Bag A and Bag B, with none left over.',
      `The ratio of purple counters in Bag A to those in Bag B is ${a} : ${b}.`,
      `Bag B contains ${difference} more purple counters than Bag A.`,
    ],
    'How many counters were in the tub before packing?',
    String(total),
    'First find all the purple counters using the difference between the bags. Then use the equal number of green counters.',
    [
      `The difference between the bags represents ${b} − ${a} = ${b - a} equal parts.`,
      `One part represents ${difference} ÷ ${b - a} = ${one} counters.`,
      `The purple counters fill ${a} + ${b} = ${a + b} parts, so there are ${a + b} × ${one} = ${purple} purple counters.`,
      `There are also ${purple} green counters. The starting total is ${purple} + ${purple} = ${total} counters.`,
    ],
    {
      unit: 'counters',
      choices: r.shuffle([total, purple, largerBag, smallerBag].map(String)),
    },
  );
}
