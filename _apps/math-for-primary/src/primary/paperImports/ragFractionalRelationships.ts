import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-ratio-from-fractional-relationships',
  level: 5,
  title: 'Compare quantities using fractions',
  objective: 'Use equal units to find a group size, a price or a group difference from fractional relationships.',
  skillIds: ['P3.S.FRAC.01', 'P4.S.FRAC.03', 'P5.S.FRAC.05'],
  canonicalPatternId: 'ratio-from-fractional-relationships',
};

type Step = NonNullable<Question['workedSteps']>[number];

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function assemble(
  seed: number,
  index: number,
  context: string[],
  prompt: string,
  answer: string,
  unit: string,
  hint: string,
  workedSteps: Step[],
  choices?: string[],
): Question {
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: workedSteps
      .map(step => [step.text, step.equation].filter(Boolean).join(' '))
      .join(' '),
    ...(choices ? {choices} : {}),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;

  if (variant === 0) {
    const [n, d] = r.pick([
      [1, 2], [2, 3], [2, 5], [3, 5], [3, 7],
      [4, 7], [5, 8], [5, 9], [7, 10],
    ]);
    let perUnit = r.int(3, 18);
    if ((n + d) * perUnit === 105) perUnit += 1;
    const totalUnits = n + d;
    const total = totalUnits * perUnit;
    const purple = d * perUnit;
    return assemble(
      seed,
      index,
      [
        'An art box holds only green counters and purple counters.',
        `There are ${total} counters altogether.`,
        `The number of green counters is ${n}/${d} of the number of purple counters.`,
      ],
      'How many purple counters are in the box?',
      String(purple),
      'counters',
      `Use ${d} equal units for the purple counters and ${n} of the same units for the green counters.`,
      [
        {
          text: 'The fraction compares the green group with the purple group.',
          equation: `Purple: ${d} units; green: ${n} units`,
        },
        {
          text: 'Add the units in both groups.',
          equation: `${d} + ${n} = ${totalUnits} units`,
        },
        {
          text: 'Divide the total number of counters by the total units.',
          equation: `${total} ÷ ${totalUnits} = ${perUnit} counters in one unit`,
        },
        {
          text: 'Find the number of purple counters.',
          equation: `${d} × ${perUnit} = ${purple} counters`,
        },
      ],
    );
  }

  if (variant === 1) {
    const [n, d] = r.pick([
      [1, 3], [2, 5], [3, 8], [4, 9],
      [5, 8], [5, 9], [3, 7], [4, 7],
    ]);
    const perUnit = r.int(4, 20);
    const differenceUnits = d - n;
    const difference = differenceUnits * perUnit;
    const scooter = d * perUnit;
    const boardGame = n * perUnit;
    const choices = r.shuffle([
      scooter.toFixed(2),
      boardGame.toFixed(2),
      difference.toFixed(2),
      (scooter + boardGame).toFixed(2),
    ]);
    return assemble(
      seed,
      index,
      [
        `A board game costs ${n}/${d} as much as a scooter.`,
        `The scooter costs $${difference.toFixed(2)} more than the board game.`,
      ],
      'What is the price of the scooter, in dollars?',
      scooter.toFixed(2),
      'dollars',
      'Represent both prices using equal units. The price difference gives the value of the extra units.',
      [
        {
          text: 'Use the scooter price as the whole being divided into equal units.',
          equation: `Scooter: ${d} units; board game: ${n} units`,
        },
        {
          text: 'Find how many units make up the price difference.',
          equation: `${d} − ${n} = ${differenceUnits} units`,
        },
        {
          text: 'Find the value of one unit.',
          equation: `$${difference.toFixed(2)} ÷ ${differenceUnits} = $${perUnit.toFixed(2)}`,
        },
        {
          text: 'Find the price of the scooter.',
          equation: `${d} × $${perUnit.toFixed(2)} = $${scooter.toFixed(2)}`,
        },
      ],
      choices,
    );
  }

  const [a, b, c, d] = r.pick([
    [2, 3, 1, 4],
    [3, 4, 1, 2],
    [2, 5, 1, 3],
    [3, 5, 2, 7],
    [4, 5, 2, 3],
    [3, 8, 1, 4],
    [5, 6, 2, 3],
  ]);
  // Each equal fractional amount contains a whole number of these units.
  const commonUnits = a * c / gcd(a, c);
  const redUnits = b * (commonUnits / a);
  const yellowUnits = d * (commonUnits / c);
  const totalUnits = redUnits + yellowUnits;
  const perUnit = r.int(2, 12);
  const total = totalUnits * perUnit;
  const difference = (yellowUnits - redUnits) * perUnit;
  return assemble(
    seed,
    index,
    [
      'A jar contains only red beads and yellow beads.',
      `There are ${total} beads altogether.`,
      `The numbers of beads in these two groups are equal: ${a}/${b} of the red beads and ${c}/${d} of the yellow beads.`,
    ],
    'How many more yellow beads than red beads are in the jar?',
    String(difference),
    'beads',
    'Show the two equal fractional amounts using the same number of equal units. Then work out the units in each whole group.',
    [
      {
        text: `Show each of the two equal fractional amounts as ${commonUnits} equal units. This number can be divided by both ${a} and ${c}.`,
        equation: `${a}/${b} of red = ${c}/${d} of yellow = ${commonUnits} units`,
      },
      {
        text: `For red beads, ${a} of the ${b} equal parts contain ${commonUnits} units. Find the units in the whole red group.`,
        equation: `${b} × (${commonUnits} ÷ ${a}) = ${redUnits} units`,
      },
      {
        text: `For yellow beads, ${c} of the ${d} equal parts contain ${commonUnits} units. Find the units in the whole yellow group.`,
        equation: `${d} × (${commonUnits} ÷ ${c}) = ${yellowUnits} units`,
      },
      {
        text: 'Add the units in the two whole groups.',
        equation: `${redUnits} + ${yellowUnits} = ${totalUnits} units`,
      },
      {
        text: 'Use the total number of beads to find one unit.',
        equation: `${total} ÷ ${totalUnits} = ${perUnit} beads in one unit`,
      },
      {
        text: 'Find the difference between the two whole groups.',
        equation: `(${yellowUnits} − ${redUnits}) × ${perUnit} = ${difference} beads`,
      },
    ],
  );
}
