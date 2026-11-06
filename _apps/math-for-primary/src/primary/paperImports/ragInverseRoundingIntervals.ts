import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-inverse-rounding-intervals',
  level: 5,
  title: 'Find numbers from rounding clues',
  objective: 'Use rounding limits to select a possible whole number or find an endpoint that satisfies every clue.',
  skillIds: ['P4.S.WN.02', 'P5.S.WN.01'],
  canonicalPatternId: 'inverse-rounding-intervals',
};

const formatInteger = (value: number): string => value.toLocaleString('en-SG');

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = random.int(0, 7);
  const roundingRule = 'Round halfway values up.';

  if (variant < 6) {
    const money = random.chance(0.5);
    const unit = money ? 100 : random.pick([1000, 10000]);
    const rounded = random.int(510, 790) * unit;
    const half = unit / 2;
    const lower = rounded - half;
    const upper = rounded + half - 1;
    const original = random.pick([
      lower,
      upper,
      random.int(lower + 1, upper - 1),
    ]);
    const amount = (value: number): string => `${money ? '$' : ''}${formatInteger(value)}`;
    const choices = random.shuffle([
      original,
      lower - 1,
      upper + 1,
      lower - random.int(2, half),
    ]).map(amount);
    const context = money
      ? [
          'A charity received a whole number of dollars in donations.',
          `Rounded to the nearest ${formatInteger(unit)} dollars, the amount is ${amount(rounded)}.`,
          roundingRule,
        ]
      : [
          'A museum recorded a whole-number total of visitors last year.',
          `Rounded to the nearest ${formatInteger(unit)}, the total is ${amount(rounded)}.`,
          roundingRule,
        ];
    const workedSteps = [
      { text: `Half of ${amount(unit)} is ${amount(half)}.` },
      {
        text: `${amount(rounded)} − ${amount(half)} = ${amount(lower)}. This lower halfway value rounds up to ${amount(rounded)}, so it is allowed.`,
      },
      {
        text: `${amount(rounded)} + ${amount(half)} = ${amount(upper + 1)}. This upper halfway value rounds up to ${amount(rounded + unit)}, so the greatest allowed original is ${amount(upper + 1)} − ${amount(1)} = ${amount(upper)}.`,
      },
      {
        text: `${amount(original)} is the only choice from ${amount(lower)} to ${amount(upper)}, including both ends.`,
      },
    ];

    return {
      key,
      context,
      prompt: money
        ? 'Which amount could the charity have received?'
        : 'Which number could be the visitor total?',
      choices,
      answer: amount(original),
      hint: 'Find the halfway value on each side of the rounded result. Then check the choices against the whole-number limits.',
      workedSteps,
      explanation: workedSteps.map(step => step.text).join(' '),
    };
  }

  if (variant === 6) {
    const rounded = random.int(510, 790) * 1000;
    const hundredLower = rounded - 50;
    const hundredUpper = rounded + 50 - 1;
    const thousandLower = rounded - 500;
    const thousandUpper = rounded + 500 - 1;
    const sharedLower = Math.max(hundredLower, thousandLower);
    const sharedUpper = Math.min(hundredUpper, thousandUpper);
    const workedSteps = [
      {
        text: `For the nearest 100, half the rounding unit is 50. The whole-number limits are ${formatInteger(rounded)} − 50 = ${formatInteger(hundredLower)} and ${formatInteger(rounded)} + 50 − 1 = ${formatInteger(hundredUpper)}.`,
      },
      {
        text: `For the nearest 1,000, half the rounding unit is 500. The whole-number limits are ${formatInteger(rounded)} − 500 = ${formatInteger(thousandLower)} and ${formatInteger(rounded)} + 500 − 1 = ${formatInteger(thousandUpper)}.`,
      },
      {
        text: `The number must lie in both ranges. Their shared range runs from ${formatInteger(sharedLower)} to ${formatInteger(sharedUpper)}, including both ends.`,
      },
      {
        text: `The greatest possible whole number is ${formatInteger(sharedUpper)}. The next whole number, ${formatInteger(sharedUpper + 1)}, rounds to ${formatInteger(rounded + 100)} to the nearest 100 and fails that clue.`,
      },
    ];

    return {
      key,
      context: [
        'A whole number has these two rounding results.',
        `Rounded to the nearest 100, the number is ${formatInteger(rounded)}.`,
        `Rounded to the nearest 1,000, the number is ${formatInteger(rounded)}.`,
        roundingRule,
      ],
      prompt: 'What is the greatest whole number that fits both clues?',
      answer: String(sharedUpper),
      hint: 'Find the allowed range for each rounding clue. Keep the numbers that belong to both ranges.',
      workedSteps,
      explanation: workedSteps.map(step => step.text).join(' '),
    };
  }

  const unit = random.pick([100, 1000, 10000]);
  const rounded = random.int(510, 790) * unit;
  const half = unit / 2;
  const smallest = rounded - half;
  const workedSteps = [
    { text: `Half of ${formatInteger(unit)} is ${formatInteger(half)}.` },
    {
      text: `${formatInteger(rounded)} − ${formatInteger(half)} = ${formatInteger(smallest)}. This is halfway between ${formatInteger(rounded - unit)} and ${formatInteger(rounded)}, so it rounds up to ${formatInteger(rounded)}.`,
    },
    {
      text: `${formatInteger(smallest - 1)} rounds down to ${formatInteger(rounded - unit)}. Therefore, the smallest possible whole number is ${formatInteger(smallest)}.`,
    },
  ];

  return {
    key,
    context: [
      'A pupil rounds a whole number.',
      `Rounded to the nearest ${formatInteger(unit)}, the number is ${formatInteger(rounded)}.`,
      roundingRule,
    ],
    prompt: 'What is the smallest possible whole number?',
    answer: String(smallest),
    hint: 'Find the halfway value between the rounded result and the rounding multiple just below it.',
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
