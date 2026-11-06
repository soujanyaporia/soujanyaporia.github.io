import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-common-factor-aggregation',
  level: 5,
  title: 'Explore shared factors',
  objective: 'Find the common factors of two whole numbers, then list, count or add them.',
  skillIds: ['P4.S.FACT.02'],
  canonicalPatternId: 'p5-common-factor-aggregation',
};

function factorsOf(number: number): number[] {
  const factors: number[] = [];
  for (let divisor = 1; divisor <= number; divisor++) {
    if (number % divisor === 0) factors.push(divisor);
  }
  return factors;
}

const numberPool = [
  18, 20, 24, 28, 30, 32, 42, 44, 45, 50, 54, 56,
  63, 64, 66, 70, 72, 75, 80, 84, 90, 96, 98, 100,
];
const eligiblePairs: [number, number][] = [];
for (const [position, first] of numberPool.entries()) {
  const firstFactors = factorsOf(first);
  for (const second of numberPool.slice(position + 1)) {
    const common = firstFactors.filter(factor => second % factor === 0);
    // The existing numeric-field control supports two through six entries.
    if (second % first !== 0 && common.length >= 2 && common.length <= 6) {
      eligiblePairs.push([first, second]);
    }
  }
}

const variants = ['count', 'count', 'list', 'sum'] as const;
const fieldLabels = [
  'Smallest common factor',
  '2nd common factor',
  '3rd common factor',
  '4th common factor',
  '5th common factor',
  '6th common factor',
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = random.pick(variants);
  const [first, second] = random.pick(eligiblePairs);
  const firstFactors = factorsOf(first);
  const secondFactors = factorsOf(second);
  const common = firstFactors.filter(factor => secondFactors.includes(factor));
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Find every positive whole-number factor of ${first}.`,
      equation: firstFactors.join(', '),
    },
    {
      text: `Find every positive whole-number factor of ${second}.`,
      equation: secondFactors.join(', '),
    },
    {
      text: 'Keep each factor that appears in both lists, including 1.',
      equation: common.join(', '),
    },
  ];

  let response: Pick<Question, 'prompt' | 'answer' | 'choices' | 'structuredResponse'>;
  if (variant === 'list') {
    response = {
      prompt: 'Write every common factor of these two numbers, starting with the smallest.',
      answer: JSON.stringify(common.map(String)),
      structuredResponse: {
        kind: 'number-fields',
        fields: common.map((_, position) => ({label: fieldLabels[position]})),
      },
    };
  } else if (variant === 'count') {
    const count = common.length;
    response = {
      prompt: 'Count the factors that the two numbers share. How many are there?',
      answer: String(count),
      choices: random.shuffle([count, count - 1, count + 1, count + 2].map(String)),
    };
    workedSteps.push({
      text: 'Count each common factor once.',
      equation: `${common.map(() => '1').join(' + ')} = ${count}`,
    });
  } else {
    const sum = common.reduce((total, factor) => total + factor, 0);
    const greatest = common[common.length - 1];
    const candidates = [sum, greatest, sum - 1, first + second, sum + 1, sum + 2];
    response = {
      prompt: 'Add all the factors shared by these two numbers. What total do you get?',
      answer: String(sum),
      choices: random.shuffle([...new Set(candidates)].slice(0, 4).map(String)),
    };
    workedSteps.push({
      text: 'Add every common factor once.',
      equation: `${common.join(' + ')} = ${sum}`,
    });
  }

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `The numbers are ${first} and ${second}.`,
      'Use positive whole-number factors.',
    ],
    ...response,
    hint: 'Make a factor list for each number. Find the numbers in both lists, including 1.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
