import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-ratio-parts-compared-with-sums',
  level: 6,
  title: 'Compare a group with the whole',
  objective: 'Use ratio parts to express a group compared with the whole collection.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-ratio-parts-compared-with-sums',
};

const COMPARISONS = [
  [1, 3], [2, 3], [2, 5], [3, 5], [5, 6], [2, 7],
  [4, 7], [5, 7], [3, 8], [5, 8], [7, 8], [4, 9],
  [5, 9], [7, 9], [5, 11], [6, 11], [7, 11], [8, 11],
] as const;

const INNER_RATIOS = [
  [2, 3], [3, 4], [4, 5], [2, 5], [3, 5], [3, 7],
] as const;

const COMBINED_RATIOS = [
  [2, 3], [2, 5], [3, 4], [3, 5], [3, 8], [4, 5],
  [4, 7], [5, 6], [5, 8], [6, 9], [4, 10], [6, 10],
] as const;

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function reducedFraction(numerator: number, denominator: number): string {
  const factor = gcd(numerator, denominator);
  return `${numerator / factor}/${denominator / factor}`;
}

function explain(steps: NonNullable<Question['workedSteps']>): string {
  return steps.map(step => step.text + (step.equation ? ` ${step.equation}.` : '')).join(' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));

  if (random.int(0, 1) === 0) {
    const [numerator, denominator] = random.pick(COMPARISONS);
    const total = numerator + denominator;
    const factor = gcd(denominator, total);
    const first = denominator / factor;
    const second = total / factor;
    const workedSteps: NonNullable<Question['workedSteps']> = [
      {
        text: 'Use the fraction to express the two groups in equal-sized parts.',
        equation: `Oval : star = ${numerator} : ${denominator}`,
      },
      {
        text: 'Add the parts for both kinds of sticker to find the whole packet.',
        equation: `${numerator} + ${denominator} = ${total} parts`,
      },
      {
        text: 'Write the star parts first and the total parts second, in simplest form.',
        equation: `Star : all = ${first} : ${second}`,
      },
    ];
    return {
      key,
      context: [
        'A packet contains only oval stickers and star stickers.',
        `The number of oval stickers is ${numerator}/${denominator} of the number of star stickers.`,
      ],
      prompt: 'Find the ratio of star stickers to all the stickers in the packet. Give the ratio in simplest form. Enter its first and second terms in the two boxes.',
      answer: JSON.stringify([String(first), String(second)]),
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: 'Star stickers (first ratio term)',
        secondLabel: 'All stickers (second ratio term)',
      },
      hint: 'Turn the fraction into ratio parts. Then add the parts for both kinds of sticker.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  const [squareParts, roundParts] = random.pick(INNER_RATIOS);
  const [triangularParts, otherParts] = random.pick(COMBINED_RATIOS);
  const total = triangularParts + otherParts;
  const answer = reducedFraction(triangularParts, total);
  const rawFraction = `${triangularParts}/${total}`;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Treat square and round buttons as one combined group. The second ratio already gives its parts.',
      equation: `Triangular : other = ${triangularParts} : ${otherParts}`,
    },
    {
      text: 'Add the triangular parts and the combined group parts to represent every button.',
      equation: `${triangularParts} + ${otherParts} = ${total} parts`,
    },
    {
      text: 'Put the triangular parts over all the parts, then simplify the fraction.',
      equation: rawFraction === answer ? answer : `${rawFraction} = ${answer}`,
    },
    {
      text: 'The square-to-round ratio describes how the other group is split. It does not change the fraction of all buttons that are triangular.',
    },
  ];
  return {
    key,
    context: [
      'A craft tray holds only square, round and triangular buttons.',
      `The ratio of square buttons to round buttons is ${squareParts}:${roundParts}.`,
      `The ratio of triangular buttons to square and round buttons together is ${triangularParts}:${otherParts}.`,
    ],
    prompt: 'Which fraction of all the buttons are triangular? Choose the fraction in simplest form.',
    answer,
    choices: random.shuffle([
      answer,
      reducedFraction(otherParts, total),
      reducedFraction(triangularParts, otherParts),
      reducedFraction(triangularParts, triangularParts + 2 * otherParts),
    ]),
    requireSimplified: true,
    hint: 'The square and round buttons together form the other group. Add its parts to the triangular parts to find the whole.',
    workedSteps,
    explanation: explain(workedSteps),
  };
}
