import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-queue-size-from-position',
  level: 2 as const,
  title: 'How many are in the queue?',
  objective: 'Use a child’s place in a queue to count everyone once, including anyone who joins later.',
  skillIds: ['P2.S.AS.01', 'P1.S.WN.06'],
  canonicalPatternId: 'p2-queue-size-from-position',
};

const backPositions = ['1st', '2nd', '3rd', '4th', '6th', '7th', '8th', '9th', '10th'];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const name = rng.pick(['Asha', 'Ravi', 'Mei', 'Dan']);
  const ahead = rng.int(6, 14);

  if ((seed + index) % 2 === 0) {
    const position = rng.pick(backPositions);
    const rank = Number.parseInt(position, 10);
    const total = ahead + rank;
    return {
      key,
      context: [
        `${name} is in the queue at a fruit stall.`,
        `${ahead} people are ahead of ${name}.`,
        `${name} is ${position} from the back.`,
      ],
      prompt: 'How many people are waiting at the stall?',
      answer: String(total),
      unit: 'people',
      hint: `Start at the back and count up to ${name}. Who does that count include?`,
      workedSteps: [
        { text: `Count from the back up to and including ${name}.`, equation: `${rank - 1} behind + 1 for ${name} = ${rank}` },
        { text: 'Add the people ahead to the group you just counted.', equation: `${ahead} + ${rank} = ${total}` },
      ],
      explanation: `${name} is already counted in the group of ${rank} at the back. The ${ahead} people ahead make a total of ${total} people.`,
      proof: { op: '+', a: ahead, b: rank },
    };
  }

  const behind = rng.pick([2, 3, 4, 6, 7, 8]);
  const joined = rng.int(3, 11);
  const atFirst = ahead + 1 + behind;
  const total = atFirst + joined;
  return {
    key,
    context: [
      `${name} is queuing for a school game.`,
      `At first, ${ahead} pupils are ahead of ${name} and ${behind} pupils are behind ${name}.`,
      `Then ${joined} more pupils join the back of the queue. Nobody leaves.`,
    ],
    prompt: 'How many pupils are in the queue now?',
    answer: String(total),
    unit: 'pupils',
    hint: `Count ${name} as well as the pupils on both sides. Then think about who joined.`,
    workedSteps: [
      { text: `Count the pupils ahead, ${name}, and the pupils behind.`, equation: `${ahead} + 1 + ${behind} = ${atFirst}` },
      { text: 'Add the pupils who came later.', equation: `${atFirst} + ${joined} = ${total}` },
    ],
    explanation: `There were ${atFirst} pupils at first, including ${name}. When ${joined} more joined, the queue grew to ${total} pupils.`,
    proof: { op: '+', a: { op: '+', a: { op: '+', a: ahead, b: 1 }, b: behind }, b: joined },
  };
}
