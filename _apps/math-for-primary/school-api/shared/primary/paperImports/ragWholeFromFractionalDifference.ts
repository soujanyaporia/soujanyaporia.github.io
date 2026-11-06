import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-whole-from-fractional-difference',
  level: 5,
  title: 'Find a whole from a difference',
  objective: 'Compare fractions of the same whole and use a known difference to find the starting quantity.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P4.S.FRAC.04'],
  canonicalPatternId: 'whole-from-fractional-difference',
} as const;

type Fractions = readonly [number, number, number, number];
type Steps = NonNullable<Question['workedSteps']>;

const ALLOCATIONS: readonly Fractions[] = [
  [3, 5, 1, 2],
  [1, 2, 1, 3],
  [2, 3, 1, 4],
  [3, 4, 1, 2],
  [5, 8, 1, 3],
  [5, 6, 1, 2],
  [2, 5, 1, 2],
];
const EQUAL_STARTS: readonly Fractions[] = [
  [1, 3, 5, 6],
  [1, 4, 3, 4],
  [2, 5, 4, 5],
  [1, 6, 2, 3],
  [1, 4, 5, 8],
  [1, 3, 3, 4],
  [2, 3, 5, 6],
];
const UNIT_VALUES = [7, 11, 13, 17, 19, 23, 29] as const;

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function fraction(n: number, d: number): string {
  const divisor = gcd(n, d);
  return d === divisor ? String(n / divisor) : `${n / divisor}/${d / divisor}`;
}

function allocationUnits([a, b, c, d]: Fractions) {
  const whole = b * d;
  const first = a * d;
  const second = (b - a) * c;
  const divisor = gcd(whole, gcd(first, second));
  return {
    whole: whole / divisor,
    first: first / divisor,
    second: second / divisor,
    last: (whole - first - second) / divisor,
  };
}

const money = (amount: number) => `$${amount.toFixed(2)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = ((hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) + offset) % 3;
  const unitValue = r.pick(UNIT_VALUES);
  const finish = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: Steps,
    extra: Partial<Question> = {},
  ): Question => ({
    key,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const fractions = r.pick(ALLOCATIONS);
    const [a, b, c, d] = fractions;
    const units = allocationUnits(fractions);
    const gapUnits = units.first - units.second;
    const difference = gapUnits * unitValue;
    const firstCost = units.first * unitValue;
    const original = units.whole * unitValue;
    const name = r.pick(['Aina', 'Ravi', 'Nadia', 'Ben', 'Mei', 'Irfan']);
    return finish(
      [
        `${name} has some money for shopping.`,
        `${name} spends ${a}/${b} of this money on a bag.`,
        `Next, ${name} spends ${c}/${d} of the money left on a book.`,
        `The bag costs ${money(difference)} more than the book.`,
      ],
      `(a) How much does the bag cost? (b) How much money did ${name} have before shopping?`,
      JSON.stringify([firstCost.toFixed(2), original.toFixed(2)]),
      'Write both costs as fractions of the starting money. Use their difference to find the value of one equal unit.',
      [
        {
          text: 'Find the fraction of the starting money left after buying the bag.',
          equation: `1 − ${a}/${b} = ${fraction(b - a, b)}`,
        },
        {
          text: 'The book uses a fraction of that remaining money.',
          equation: `${c}/${d} × ${fraction(b - a, b)} = ${fraction(units.second, units.whole)} of the starting money`,
        },
        {
          text: `Split the starting money into ${units.whole} equal units and compare the two costs.`,
          equation: `${units.first}/${units.whole} − ${units.second}/${units.whole} = ${gapUnits}/${units.whole}`,
        },
        {
          text: `${gapUnits} equal units are worth ${money(difference)}. Find the value of one unit.`,
          equation: `${money(difference)} ÷ ${gapUnits} = ${money(unitValue)}`,
        },
        {
          text: `(a) The bag costs ${units.first} units.`,
          equation: `${units.first} × ${money(unitValue)} = ${money(firstCost)}`,
        },
        {
          text: `(b) The starting money is all ${units.whole} units.`,
          equation: `${units.whole} × ${money(unitValue)} = ${money(original)}`,
        },
      ],
      {
        unit: 'dollars',
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Bag cost ($)', decimal: true},
            {label: '(b) Starting money ($)', decimal: true},
          ],
        },
      },
    );
  }

  if (variant === 1) {
    const [a, b, c, d] = r.pick(EQUAL_STARTS);
    const wholeUnits = b * d / gcd(b, d);
    const orangeUnits = (b - a) * wholeUnits / b;
    const purpleUnits = (d - c) * wholeUnits / d;
    const gapUnits = orangeUnits - purpleUnits;
    const difference = gapUnits * unitValue;
    const each = wholeUnits * unitValue;
    const total = each * 2;
    return finish(
      [
        'A craft club starts with the same number of orange buttons and purple buttons.',
        `It uses ${a}/${b} of the orange buttons and ${c}/${d} of the purple buttons.`,
        `There are ${difference} more orange buttons than purple buttons left.`,
      ],
      'How many buttons did the club have altogether at the start?',
      String(total),
      'The two starting amounts are equal. Compare the fractions left to find one starting amount, then count both colours.',
      [
        {
          text: 'Treat the starting number of each colour as one whole. Find the fraction of orange buttons left.',
          equation: `1 − ${a}/${b} = ${fraction(b - a, b)}`,
        },
        {
          text: 'Find the fraction of purple buttons left.',
          equation: `1 − ${c}/${d} = ${fraction(d - c, d)}`,
        },
        {
          text: `Split each equal starting amount into ${wholeUnits} equal units. Compare the amounts left.`,
          equation: `${orangeUnits}/${wholeUnits} − ${purpleUnits}/${wholeUnits} = ${gapUnits}/${wholeUnits}`,
        },
        {
          text: `${gapUnits} units represent ${difference} buttons. Find one unit.`,
          equation: `${difference} ÷ ${gapUnits} = ${unitValue} buttons`,
        },
        {
          text: 'Find the starting number of buttons of one colour.',
          equation: `${wholeUnits} × ${unitValue} = ${each} buttons`,
        },
        {
          text: 'There were two equal starting amounts.',
          equation: `2 × ${each} = ${total} buttons`,
        },
      ],
      {
        unit: 'buttons',
        choices: r.shuffle([total, each, total - difference, total + difference].map(String)),
      },
    );
  }

  const fractions = r.pick(ALLOCATIONS);
  const [a, b, c, d] = fractions;
  const units = allocationUnits(fractions);
  const gapUnits = units.first - units.last;
  const difference = gapUnits * unitValue;
  const total = units.whole * unitValue;
  return finish(
    [
      'A box holds only red, blue and green beads.',
      `${a}/${b} of all the beads are red.`,
      `${c}/${d} of the beads that are not red are blue. The rest are green.`,
      `There are ${difference} more red beads than green beads.`,
    ],
    'How many beads are in the box altogether?',
    String(total),
    'Find the green beads as a fraction of all the beads, then compare this with the red fraction.',
    [
      {
        text: 'Find the fraction of all the beads that are not red.',
        equation: `1 − ${a}/${b} = ${fraction(b - a, b)}`,
      },
      {
        text: 'Of the beads that are not red, find the fraction that are green.',
        equation: `1 − ${c}/${d} = ${fraction(d - c, d)}`,
      },
      {
        text: 'Express the green beads as a fraction of all the beads.',
        equation: `${fraction(d - c, d)} × ${fraction(b - a, b)} = ${fraction(units.last, units.whole)}`,
      },
      {
        text: `Split all the beads into ${units.whole} equal units. Compare the red and green amounts.`,
        equation: `${units.first}/${units.whole} − ${units.last}/${units.whole} = ${gapUnits}/${units.whole}`,
      },
      {
        text: `${gapUnits} units represent ${difference} beads. Find one unit.`,
        equation: `${difference} ÷ ${gapUnits} = ${unitValue} beads`,
      },
      {
        text: `All the beads make ${units.whole} units.`,
        equation: `${units.whole} × ${unitValue} = ${total} beads`,
      },
    ],
    {unit: 'beads'},
  );
}
