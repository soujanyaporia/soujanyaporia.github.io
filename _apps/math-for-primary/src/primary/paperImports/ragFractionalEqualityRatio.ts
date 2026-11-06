import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-fractional-equality-ratio',
  level: 6,
  title: 'Find amounts from equal fractional parts',
  objective: 'Turn equal fractions of two collections into a ratio, then use a known amount or difference.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.04', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-fractional-equality-establishes-ratio',
};

type Step = NonNullable<Question['workedSteps']>[number];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

// Each row gives two reduced proper fractions. The first is larger.
const COEFFICIENTS: readonly (readonly [number, number, number, number])[] = [
  [3, 4, 1, 2],
  [4, 5, 2, 3],
  [2, 5, 1, 4],
  [3, 5, 1, 3],
  [3, 4, 2, 5],
  [5, 6, 3, 4],
  [4, 7, 2, 5],
  [5, 8, 3, 7],
  [3, 7, 2, 9],
  [4, 9, 1, 3],
  [3, 8, 1, 4],
  [4, 7, 3, 7],
  [5, 8, 3, 8],
  [3, 5, 3, 8],
  [2, 7, 2, 9],
];

const NAMES = [
  ['Asha', 'Ben'],
  ['Mei', 'Zane'],
  ['Hana', 'Irfan'],
  ['Nila', 'Owen'],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) + Math.trunc(index);
  const variant = ((offset % 4) + 4) % 4;
  const [first, second] = rng.pick(NAMES);
  const item = rng.pick(['buttons', 'beads', 'shells', 'cards']);
  const [a, b, c, d] = rng.pick(COEFFICIENTS);

  // Equal numerators expose equal-sized parts in the two collections.
  const numerator = a * c / gcd(a, c);
  const firstDenominator = b * (numerator / a);
  const secondDenominator = d * (numerator / c);
  const divisor = gcd(firstDenominator, secondDenominator);
  const firstParts = firstDenominator / divisor;
  const secondParts = secondDenominator / divisor;

  // This scale keeps even the common-numerator parts as whole items.
  const unit = divisor * 4 * rng.int(2, 5);
  const firstCount = firstParts * unit;
  const secondCount = secondParts * unit;
  const difference = secondCount - firstCount;
  const total = firstCount + secondCount;

  const context = [
    `${first} and ${second} each have some ${item}.`,
    `Taking ${a}/${b} of ${first}'s ${item} gives the same number as taking ${c}/${d} of ${second}'s ${item}.`,
  ];

  const ratioSteps: Step[] = [
    {
      text: 'Write the two fractions with the same numerator.',
      equation: `${a}/${b} = ${numerator}/${firstDenominator}; ${c}/${d} = ${numerator}/${secondDenominator}`,
    },
    {
      text: `The selected groups are equal. Divide each selected group into ${numerator} equal parts. One part from either collection is then equal.`,
      equation: `1/${firstDenominator} of ${first}'s ${item} = 1/${secondDenominator} of ${second}'s ${item}`,
    },
    {
      text: 'Compare the numbers of these equal parts in the whole collections. Write the ratio in simplest form.',
      equation: `${first} : ${second} = ${firstDenominator} : ${secondDenominator}${divisor === 1 ? '' : ` = ${firstParts} : ${secondParts}`}`,
    },
  ];

  const finish = (
    prompt: string,
    answer: string,
    hint: string,
    tail: Step[],
    extra: Partial<Question> = {},
  ): Question => {
    const workedSteps = [...ratioSteps, ...tail];
    return {
      key,
      context,
      prompt,
      answer,
      hint,
      workedSteps,
      explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' '),
      ...extra,
    };
  };

  if (variant === 0) {
    return finish(
      `What is the ratio of the number of ${item} ${first} has to the number ${second} has? Give both terms in simplest form.`,
      JSON.stringify([String(firstParts), String(secondParts)]),
      'Make the fractions have the same numerator, then compare the numbers of equal parts in the whole collections.',
      [],
      {
        structuredResponse: {
          kind: 'number-pair',
          firstLabel: `${first}'s parts`,
          secondLabel: `${second}'s parts`,
        },
      },
    );
  }

  if (variant === 1 || variant === 2) {
    context.push(`${second} has ${difference} more ${item} than ${first}.`);
    const extraParts = secondParts - firstParts;
    const differenceSteps: Step[] = [
      {
        text: 'Find how many ratio parts make up the difference.',
        equation: `${secondParts} − ${firstParts} = ${extraParts}`,
      },
      {
        text: `These ${extraParts} ratio parts represent ${difference} ${item}. Find one ratio part.`,
        equation: `${difference} ÷ ${extraParts} = ${unit} ${item}`,
      },
    ];
    const hint = 'Find the quantity ratio first. Match the difference to the extra ratio parts.';

    if (variant === 1) {
      return finish(
        `How many ${item} does ${second} have?`,
        String(secondCount),
        hint,
        [...differenceSteps, {
          text: `${second}'s collection has ${secondParts} ratio parts.`,
          equation: `${secondParts} × ${unit} = ${secondCount} ${item}`,
        }],
        { unit: item },
      );
    }

    return finish(
      `How many ${item} do ${first} and ${second} have altogether?`,
      String(total),
      hint,
      [...differenceSteps, {
        text: 'Add the ratio parts for both collections.',
        equation: `${firstParts} + ${secondParts} = ${firstParts + secondParts}`,
      }, {
        text: 'Multiply the total number of ratio parts by the amount in one part.',
        equation: `${firstParts + secondParts} × ${unit} = ${total} ${item}`,
      }],
      { unit: item },
    );
  }

  context.push(`${first} has ${firstCount} ${item}.`);
  const wrong = [...new Set([
    secondCount,
    firstCount,
    difference,
    2 * firstCount,
    total + unit,
  ])].filter(value => value > 0 && value !== total).slice(0, 3);

  return finish(
    `How many ${item} do ${first} and ${second} have altogether?`,
    String(total),
    `Use ${first}'s known number to find one ratio part. Find the other collection, then add both amounts.`,
    [{
      text: `${first}'s collection has ${firstParts} ratio parts. Find one part.`,
      equation: `${firstCount} ÷ ${firstParts} = ${unit} ${item}`,
    }, {
      text: `${second}'s collection has ${secondParts} ratio parts.`,
      equation: `${secondParts} × ${unit} = ${secondCount} ${item}`,
    }, {
      text: 'Add the two collections.',
      equation: `${firstCount} + ${secondCount} = ${total} ${item}`,
    }],
    { unit: item, choices: rng.shuffle([String(total), ...wrong.map(String)]) },
  );
}
