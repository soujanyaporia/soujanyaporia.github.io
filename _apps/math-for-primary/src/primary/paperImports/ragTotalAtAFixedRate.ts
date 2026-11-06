import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-total-at-a-fixed-rate',
  level: 2 as const,
  title: 'Find the total when everyone or every day counts',
  objective: 'Work out how many people or days to count, then multiply by the amount for each one.',
  skillIds: ['P2.S.MD.01', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-total-at-a-fixed-rate',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const name = rng.pick(['Mei', 'Ravi', 'Hana', 'Adam', 'Jia', 'Devi']);

  if (rng.int(0, 2) === 0) {
    const daily = rng.pick([2, 3, 4, 10]);
    const days = 7;
    const total = days * daily;
    const equation = `${days} × ${daily} = ${total}`;
    return {
      key,
      context: [`${name} reads ${daily} pages of a storybook each day for one full week.`],
      prompt: `Label the first part of the bar. Then fill in the number sentence to show how many pages ${name} reads in one week.`,
      display: '___ days × ___ pages each day = ___ pages in one week',
      picture: {
        type: 'paper', layout: 'bars', heading: 'Each part stands for one day',
        rows: [{ label: 'One week', parts: Array.from({ length: days }, (_, i) => ({ size: 1, label: i === 0 ? '?' : '' })) }],
        totalLabel: '? pages in all',
      },
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          { label: 'Label for the first part (pages)' },
          { label: 'Days in the week' },
          { label: 'Pages each day' },
          { label: 'Pages read in one week' },
        ],
      },
      answer: JSON.stringify([daily, days, daily, total].map(String)),
      hint: 'What belongs in one part of the bar? Count how many times that part is repeated.',
      workedSteps: [
        { text: `Write ${daily} above the first part. That is how many pages ${name} reads in one day.` },
        { text: 'Count one part for each day of the week.', equation: '1 week = 7 days' },
        { text: `Count ${daily} pages for each of the seven days.`, equation },
      ],
      explanation: `There are ${days} days in a week. ${equation}. ${name} reads ${total} pages that week.`,
    };
  }

  const classmates = rng.int(4, 8);
  const perChild = rng.pick([2, 3, 4, 5, 10]);
  const children = classmates + 1;
  const total = children * perChild;
  const unit = rng.pick(['paper stars', 'bookmarks', 'paper fans']);
  return {
    key,
    context: [
      `${name} sits at the craft table with ${classmates} classmates.`,
      `Each child at the table makes ${perChild} ${unit}.`,
    ],
    prompt: `How many ${unit} do the children make in all? Show your working on paper, then enter the total.`,
    unit,
    answer: String(total),
    hint: `Count ${name} as well as the classmates. Each child makes one group of ${unit}.`,
    workedSteps: [
      { text: `Count the classmates and ${name}.`, equation: `${classmates} + 1 = ${children}` },
      { text: `Count ${perChild} ${unit} for each child.`, equation: `${children} × ${perChild} = ${total}` },
    ],
    explanation: `${name} and the classmates make a group of ${children} children. Together they make ${total} ${unit}.`,
    proof: { op: '*', a: { op: '+', a: classmates, b: 1 }, b: perChild },
  };
}
