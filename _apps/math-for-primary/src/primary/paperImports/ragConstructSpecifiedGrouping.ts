import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { exampleGrouping, groupingValue, type GroupingSpec } from '../groupingAnswer';

export const RAG_PATTERN = {
  id: 'p1s-rag-construct-specified-grouping',
  level: 1,
  title: 'Make the groups',
  objective: 'Use every pictured object once to make a given number of groups of a given size.',
  skillIds: ['P1.S.MD.01'],
  canonicalPatternId: 'construct-a-specified-grouping',
};

// Each pair is [number of groups, gifts per group].
const plans = [
  [2, 3], [2, 5], [3, 4], [3, 5], [4, 3], [4, 5],
  [5, 2], [5, 4], [5, 6], [6, 4], [7, 3], [7, 4],
] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const [count, size] = rng.pick(plans);
  const total = count * size;
  const grouping: GroupingSpec = {
    total, objectLabel: 'gift', target: { kind: 'size', value: size },
  };
  const sum = Array.from({ length: count }, () => size).join(' + ');
  return {
    key,
    prompt: `Make ${count} groups. Put ${size} gifts in each group. Use every gift once.`,
    grouping,
    answer: groupingValue(exampleGrouping(grouping)),
    hint: `Count out ${size} gifts for your first group. Choose another ${size} gifts for your next group.`,
    workedSteps: [
      { text: `One way to start is to put gifts 1 to ${size} together.` },
      { text: `Take ${size} unused gifts for each new group until you have ${count} groups.` },
      {
        text: 'Count the gifts in each group to check that you used them all. Each star below stands for one gift.',
        equation: `${sum} = ${total}`,
        picture: { type: 'counters', count: total, group: size },
      },
    ],
    explanation: `There are ${count} groups with ${size} gifts in each. Together they use all ${total} gifts.`,
  };
}
