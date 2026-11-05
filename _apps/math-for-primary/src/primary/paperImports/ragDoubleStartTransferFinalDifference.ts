import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p4-double-start-transfer-final-difference',
  level: 4,
  title: 'Beads in the top tray',
  objective: 'Work back from the difference after a transfer to find how many beads were in the larger tray at first.',
  skillIds: ['P4.S.MD.01'],
  canonicalPatternId: 'double-start-transfer-final-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const moved = rng.int(11, 24);
  const finalDifference = rng.int(12, 39);
  const changeInDifference = 2 * moved;
  const startingDifference = finalDifference + changeInDifference;
  const topAtStart = 2 * startingDifference;

  const workedSteps = [
    {
      text: `The top tray lost ${moved} beads and the bottom tray gained ${moved}. The difference shrank by both amounts together.`,
      equation: `${moved} + ${moved} = ${changeInDifference} beads`,
    },
    {
      text: 'Add that change back to find how many more beads the top tray held at the start.',
      equation: `${finalDifference} + ${changeInDifference} = ${startingDifference} beads`,
    },
    {
      text: 'At the start, the bottom tray held one part and the top tray held two equal parts. The difference was one part. Double it to find the number in the top tray.',
      equation: `${startingDifference} × 2 = ${topAtStart} beads`,
    },
  ];

  return {
    key,
    context: [
      'The top tray held twice as many beads as the bottom tray.',
      `Mei moved ${moved} beads from the top tray to the bottom tray.`,
      `The top tray then held ${finalDifference} more beads than the bottom tray.`,
    ],
    prompt: 'How many beads were in the top tray before Mei moved any? Show your working on paper.',
    answer: String(topAtStart),
    unit: 'beads',
    hint: 'Imagine moving one bead back. What happens to the number in each tray? How much bigger does the difference get?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
