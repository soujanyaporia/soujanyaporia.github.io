import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-three-money-amounts',
  level: 2,
  title: 'Compare three amounts of money',
  objective: 'Use price or savings clues to find a difference and, when asked, the total of three amounts.',
  skillIds: ['P2.S.MONEY.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-differences-among-three-amounts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const priceQuestion = (Math.abs(seed % 2) + Math.abs(index % 2)) % 2 === 0;

  if (priceQuestion) {
    const stool = rng.int(42, 94);
    const reduction = rng.int(106, 189);
    const table = stool + reduction;
    const chair = stool + rng.int(18, 64);
    const difference = chair - stool;
    return {
      key,
      context: [
        `The price tag on a table shows $${table}.`,
        `A stool costs $${reduction} less than the table.`,
        `The price tag on a chair shows $${chair}.`,
      ],
      prompt: 'How many more dollars would you pay for the chair than for the stool?',
      answer: String(difference),
      unit: 'dollars',
      hint: 'Which clue helps you work out the price of the stool?',
      workedSteps: [
        { text: 'Start with the price of the table. Take away the amount saved by buying the stool.', equation: `$${table} − $${reduction} = $${stool}` },
        { text: 'Subtract the price of the stool from the price of the chair.', equation: `$${chair} − $${stool} = $${difference}` },
      ],
      explanation: `The stool costs $${stool}. You would pay $${difference} more for the chair.`,
      proof: { op: '-', a: chair, b: { op: '-', a: table, b: reduction } },
    };
  }

  const mei = rng.int(105, 178);
  const firstGap = rng.pick([15, 25, 35, 45]);
  const secondGap = rng.pick([10, 30, 50]);
  const difference = firstGap + secondGap;
  const amir = mei + firstGap;
  const tess = mei + difference;
  const total = mei + amir + tess;
  return {
    key,
    context: [
      `Mei saved $${mei}.`,
      `Amir saved $${firstGap} more than Mei.`,
      `Amir saved $${secondGap} less than Tess.`,
    ],
    prompt: '(a) How many more dollars did Tess save than Mei? (b) How much did the three children save altogether?',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Extra money Tess saved (dollars)',
      secondLabel: '(b) Total savings (dollars)',
    },
    answer: JSON.stringify([String(difference), String(total)]),
    hint: 'Start with Mei. How much more did Amir save? How much more did Tess save than Amir?',
    workedSteps: [
      { text: '(a) Add the two gaps to find how much more Tess saved than Mei.', equation: `$${firstGap} + $${secondGap} = $${difference}` },
      { text: '(b) Add the first gap to Mei’s savings to find Amir’s savings.', equation: `$${mei} + $${firstGap} = $${amir}` },
      { text: 'Add the difference from part (a) to Mei’s savings to find Tess’s savings.', equation: `$${mei} + $${difference} = $${tess}` },
      { text: 'Count each child’s savings once.', equation: `$${mei} + $${amir} + $${tess} = $${total}` },
    ],
    explanation: `Tess saved $${difference} more than Mei. Together the children saved $${total}.`,
  };
}
