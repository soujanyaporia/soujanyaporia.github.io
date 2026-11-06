import { Rng, hashString } from '../../engine/random';
import { fraction, type Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-equal-periodic-allocation',
  level: 5,
  title: 'Find an equal daily share',
  objective: 'Find a daily amount from a fraction used over several days or weeks.',
  skillIds: [
    'P5.S.FRAC.05',
    'P5.S.FRAC.06',
    'P5.S.RATE.02',
    'P3.S.FRAC.02',
  ],
  canonicalPatternId: 'p5-equal-periodic-allocation',
};

const fractions = [
  [2, 3],
  [3, 4],
  [2, 5],
  [3, 5],
  [5, 6],
  [3, 7],
  [4, 7],
  [5, 8],
  [7, 8],
  [4, 9],
  [5, 9],
  [7, 10],
  [9, 10],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const variant = random.int(0, 1);
  const [numerator, denominator] = random.pick(fractions);

  if (variant === 0) {
    const days = random.pick([3, 4, 6, 7, 8, 9]);
    const scales = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter(
      value => denominator * days * value !== 200,
    );
    const budget = denominator * days * random.pick(scales);
    const onePart = budget / denominator;
    const spent = onePart * numerator;
    const daily = spent / days;
    const workedSteps = [
      {
        text: 'Find the value of one equal part of the money set aside.',
        equation: `$${budget} ÷ ${denominator} = $${onePart}`,
      },
      {
        text: 'Find the total amount spent across all the days.',
        equation: `$${onePart} × ${numerator} = $${spent}`,
      },
      {
        text: 'Share the amount spent equally among the days.',
        equation: `$${spent} ÷ ${days} = $${daily}`,
      },
    ];

    // These fractions exceed one third and exclude one half. With at least
    // three days, all four amounts below are positive and distinct.
    const choices = random.shuffle([
      String(daily),
      String(budget / days),
      String((budget - spent) / days),
      String(spent),
    ]);

    return {
      key,
      prompt: 'How much money does the club spend each day?',
      context: [
        `A craft club sets aside $${budget} for supplies.`,
        `Across ${days} days, the club spends ${numerator}/${denominator} of that amount in total, using an equal amount each day.`,
      ],
      answer: String(daily),
      choices,
      unit: 'dollars',
      hint: 'Find how much is spent over all the days. Then find one day’s share.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
      proof: {
        op: '/',
        a: {
          op: '*',
          a: { op: '/', a: budget, b: denominator },
          b: numerator,
        },
        b: days,
      },
    };
  }

  const weeks = random.pick([3, 4]);
  const days = weeks * 7;
  const rawAnswer = `${numerator}/${denominator * days}`;
  const answer = fraction(numerator, denominator * days);
  const finalStep = rawAnswer === answer
    ? {
        text: 'This fraction already has no common factor greater than 1.',
        equation: answer,
      }
    : {
        text: 'Divide the numerator and denominator by their common factor to simplify.',
        equation: `${rawAnswer} = ${answer}`,
      };
  const workedSteps = [
    {
      text: 'Convert the reading time to days. Each week has 7 days.',
      equation: `${weeks} × 7 = ${days} days`,
    },
    {
      text: `One day is 1/${days} of the reading time. Take this fraction of the amount completed.`,
      equation: `${numerator}/${denominator} × 1/${days} = ${rawAnswer}`,
    },
    finalStep,
  ];

  return {
    key,
    prompt: 'What fraction of the whole book does the reader finish each day? Give your answer in simplest form.',
    context: [
      `A reader finishes ${numerator}/${denominator} of a storybook over ${weeks} weeks.`,
      'The number of pages read is the same every day, including weekends.',
    ],
    answer,
    requireSimplified: true,
    hint: 'Count all the days first. Each day accounts for an equal part of the fraction completed.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {
      op: '*',
      a: { op: '/', a: numerator, b: denominator },
      b: { op: '/', a: 1, b: days },
    },
  };
}
