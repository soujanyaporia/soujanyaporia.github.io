import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-interval-values',
  level: 3,
  title: 'Which numbers fit between the limits?',
  objective: 'Use the two limits to list the odd numbers or times-table answers that fit. Count them, add them or find the numbers that made them.',
  skillIds: ['P3.S.WN.03', 'P2.S.WN.06', 'P3.S.MD.01', 'P3.S.MD.04', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-regularly-spaced-values-in-an-interval',
} as const;

const variants = ['odd-count', 'table-count', 'odd-sum', 'input-pair'] as const;
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const position = hashString(String(seed)) + Math.trunc(index);
  const variant = variants[((position % variants.length) + variants.length) % variants.length];
  const odd = variant === 'odd-count' || variant === 'odd-sum';
  const inclusive = variant === 'odd-count';
  const step = odd ? 2 : rng.pick([6, 8, 9]);

  let lower: number;
  let upper: number;
  if (odd) {
    lower = inclusive ? rng.int(135, 260) : rng.int(13, 48);
    upper = lower + (inclusive ? rng.int(16, 29) : rng.int(7, 12));
  } else {
    const rows = variant === 'input-pair' ? 2 : rng.int(3, 5);
    const firstRow = rng.int(2, 11 - rows);
    // A limit may land on the neighbouring product. Strict bounds exclude it.
    lower = firstRow * step - rng.int(1, step);
    upper = (firstRow + rows - 1) * step + rng.int(1, step);
  }

  const start = inclusive ? lower : lower + 1;
  const end = inclusive ? upper : upper - 1;
  const offset = odd ? 1 : 0;
  const first = offset + step * Math.ceil((start - offset) / step);
  const last = offset + step * Math.floor((end - offset) / step);
  const values: number[] = [];
  for (let value = first; value <= last; value += step) values.push(value);
  const count = values.length;

  function choice(prompt: string, answer: string, alternatives: string[], hint: string, workedSteps: Steps): Question {
    return {
      key, prompt, answer, choices: rng.shuffle([answer, ...alternatives]), hint, workedSteps,
      explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 'odd-count') {
    return choice(
      `How many odd whole numbers are there from ${lower} to ${upper}, including both ends?`,
      String(count), [count - 1, count + 1, upper - lower + 1].map(String),
      'Find the first and last odd numbers. Each jump of two takes you to the next one.',
      [
        { text: `The first odd number in the list is ${first}. The last is ${last}.` },
        { text: 'Count the jumps of two from the first odd number to the last.', equation: `(${last} − ${first}) ÷ 2 = ${count - 1}` },
        { text: 'Count the starting number as well.', equation: `${count - 1} + 1 = ${count}` },
      ],
    );
  }

  if (variant === 'odd-sum') {
    const total = values.reduce((sum, value) => sum + value, 0);
    return choice(
      `Add all the odd numbers that are greater than ${lower} and less than ${upper}. What total do you get?`,
      String(total), [total - first, total - last, total + last + 2].map(String),
      'Start just above the smaller number. Find the first odd number, then count on in twos.',
      [
        { text: `Start with ${first} and stop at ${last}. Leave both limits out.`, equation: values.join(', ') },
        { text: 'Add each number in the list once.', equation: `${values.join(' + ')} = ${total}` },
      ],
    );
  }

  const tableSteps: Steps = [
    { text: `Find the first answer in the ${step} times table above ${lower}.`, equation: `${first / step} × ${step} = ${first}` },
    { text: `Count on in steps of ${step}. Stop before ${last + step}, which reaches or passes ${upper}.`, equation: values.join(', ') },
  ];
  if (variant === 'table-count') {
    return choice(
      `Look at the ${step} times table. How many of its answers are greater than ${lower} and less than ${upper}?`,
      String(count), [count - 1, count + 1, count + 2].map(String),
      'Find the first table answer above the smaller number. Keep counting on while you are below the larger number.',
      [...tableSteps, { text: `There are ${count} table answers in the list.` }],
    );
  }

  const a = first / step;
  const b = last / step;
  const pair = (x: number, y: number) => `${x} and ${y}`;
  return choice(
    `Multiply each number in a pair by ${step}. Which pair gives two answers that are both greater than ${lower} and less than ${upper}?`,
    pair(a, b), [pair(a - 1, b - 1), pair(a + 1, b + 1), pair(a - 1, b)],
    'Find the two table answers inside the limits. Work backwards to find the number that made each answer.',
    [...tableSteps,
      { text: 'Divide the first table answer to find its starting number.', equation: `${first} ÷ ${step} = ${a}` },
      { text: 'Do the same for the second table answer.', equation: `${last} ÷ ${step} = ${b}` },
    ],
  );
}
