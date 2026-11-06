import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p3-equally-spaced-points',
  level: 3,
  title: 'Count flags along a path',
  objective: 'Find how many equal gaps fit along a path, then count the flags at both ends and in between.',
  skillIds: ['P3.S.MD.04', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-direct-calculations-with-equally-spaced-points',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const spacing = rng.pick([3, 5, 6, 7, 9]);
  const gaps = rng.int(12, 48);
  const length = gaps * spacing;
  const flags = gaps + 1;

  return {
    key,
    context: [
      `A straight path is ${length} m long.`,
      'Flags stand in one row along one side of the path, with a flag at each end.',
      `The gap between neighbouring flags is ${spacing} m.`,
    ],
    prompt: 'How many flags are in the row?',
    answer: String(flags),
    unit: 'flags',
    hint: 'Imagine walking from the first flag to the next. You pass across one gap, but how many flags have you seen?',
    workedSteps: [
      { text: 'Divide the length of the path by the length of one gap to count the gaps.', equation: `${length} ÷ ${spacing} = ${gaps} gaps` },
      { text: 'Count the flag at the start. Each gap takes you to one more flag.', equation: `1 + ${gaps} = ${flags} flags` },
    ],
    explanation: `There are ${gaps} gaps. There is one flag before the first gap and one at the far end of each gap, making ${flags} flags altogether.`,
    proof: { op: '+', a: 1, b: { op: '/', a: length, b: spacing } },
  };
}
