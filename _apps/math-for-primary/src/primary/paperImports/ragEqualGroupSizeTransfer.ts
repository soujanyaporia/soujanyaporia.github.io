import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p1-equal-group-size-transfer',
  level: 1,
  title: 'Find and combine equal groups',
  objective: 'Use the size of one group to find an equal group, then find the combined total.',
  skillIds: ['P1.S.MD.01', 'P1.S.AS.01'],
  canonicalPatternId: 'p1-equal-group-size-transfer',
} as const;

const groupSizes = [2, 4, 5, 6, 7, 8, 9];

export function makeRagQuestion(seed: number, index = 0): Question {
  const choice = (Math.abs(seed % 1009) + 37 * Math.abs(index % 1009)) % groupSizes.length;
  const cars = groupSizes[choice];
  const bicycles = cars;
  const total = cars + bicycles;

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'How many bicycles did she draw, and how many cars and bicycles did she draw altogether?',
    context: [`At art class, Mei draws ${cars} cars. She draws the same number of bicycles.`],
    answer: JSON.stringify([String(bicycles), String(total)]),
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: 'Bicycles'},
        {label: 'Cars and bicycles altogether'},
      ],
    },
    unit: 'items',
    hint: 'The bicycles must be equal in number to the cars. Add the two group sizes to find the total.',
    explanation: `There are ${cars} bicycles because that is the same number as the cars. ${cars} + ${bicycles} = ${total} items altogether.`,
    workedSteps: [
      {text: 'Use the number of cars for the equal group of bicycles.', equation: `${cars} bicycles`},
      {text: 'Add the cars and bicycles to find the total.', equation: `${cars} + ${bicycles} = ${total}`},
    ],
  };
}
