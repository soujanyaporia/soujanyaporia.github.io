import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-scale-or-offset-known-quantity',
  level: 6,
  title: 'Write an expression from two relationships',
  objective: 'Form an expression by multiplying or dividing a variable quantity, then applying a stated difference.',
  skillIds: ['P6.S.ALG.01', 'P6.S.ALG.02'],
  canonicalPatternId: 'p6-scale-or-offset-known-quantity',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = ((seed >>> 0) % 3 + (index >>> 0) % 3) % 3;
  const factor = r.pick([2, 4, 5, 6]);
  const difference = r.int(5, 9);
  const letter = r.pick(['n', 'p', 't', 'w']);

  if (mode === 2) {
    const [known, middle, target] = r.pick([
      ['red', 'blue', 'green'],
      ['yellow', 'white', 'purple'],
      ['orange', 'pink', 'black'],
    ]);
    const part = `${letter}/${factor}`;
    const answer = `${part} + ${difference}`;
    const workedSteps = [
      {
        text: `The ${known} count is ${factor} times the ${middle} count, so divide to express the ${middle} count.`,
        equation: `${letter} ÷ ${factor} = ${part}`,
      },
      {
        text: `There are ${difference} more ${target} beads, so add ${difference} to the ${middle} count.`,
        equation: `Number of ${target} beads = ${answer}`,
      },
    ];
    return {
      key,
      context: [
        `A tray contains ${letter} ${known} beads.`,
        `The number of ${known} beads is ${factor} times the number of ${middle} beads.`,
        `There are ${difference} more ${target} beads than ${middle} beads.`,
        `${letter} is a positive whole-number multiple of ${factor}.`,
      ],
      prompt: `Which expression gives the number of ${target} beads in terms of ${letter}?`,
      answer,
      choices: r.shuffle([
        answer,
        `${factor}${letter} + ${difference}`,
        `${part} - ${difference}`,
        `(${letter} + ${difference})/${factor}`,
      ]),
      unit: 'beads',
      hint: 'First decide which count is larger. Find the smaller count before adding the difference.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  const [young, middle, target] = r.pick([
    ['Asha', 'Dylan', 'Mira'],
    ['Noor', 'Ethan', 'Zara'],
    ['Lena', 'Ravi', 'Hana'],
  ]);
  const middleIsOlder = mode === 1;
  const comparison = middleIsOlder ? 'older' : 'younger';
  const operation = middleIsOlder ? '-' : '+';
  const term = `${factor}${letter}`;
  const answer = `${term}${operation}${difference}`;
  const workedSteps = [
    {
      text: `Express ${middle}'s age by multiplying ${young}'s age by ${factor}.`,
      equation: `${factor} × ${letter} = ${term}`,
    },
    {
      text: middleIsOlder
        ? `${target} is ${difference} years younger than ${middle}, so subtract ${difference}.`
        : `${target} is ${difference} years older than ${middle}, so add ${difference}.`,
      equation: `${target}'s age = ${term} ${operation} ${difference} years`,
    },
  ];
  return {
    key,
    context: [
      `${young}'s age is ${letter} years.`,
      `${middle}'s age is ${factor} times ${young}'s age.`,
      `${middle} is ${difference} years ${comparison} than ${target}.`,
      `${letter} is a whole number from 6 to 12.`,
    ],
    prompt: `Write ${target}'s age in terms of ${letter}. Put the letter term first, followed by + or - and the number. Type without spaces.`,
    answer,
    unit: 'years',
    hint: 'Express the middle person’s age first. Then decide whether the person asked about is older or younger.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
