import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p3-equal-groups-expressions',
  level: 3,
  title: 'One addend for each group',
  objective: 'Match equal groups to sums and products, and count the groups left in a partly expanded product.',
  skillIds: ['P3.S.MD.01', 'P1.S.MD.01'],
  canonicalPatternId: 'equal-groups-in-pictures-and-expressions',
};

const repeat = (value: number, count: number, sign = ' + ') =>
  Array.from({ length: count }, () => String(value)).join(sign);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((seed >>> 0) + (index >>> 0)) % 10;
  const groups = r.int(slot === 9 ? 4 : 2, 5);
  // These pairs keep sums short, totals within 40 and both factor roles distinct.
  const sizes = groups === 4 ? [6, 9] : groups === 5 ? [6, 7] : [6, 7, 8, 9];
  const size = r.pick(sizes);
  const sum = repeat(size, groups);
  const product = `${groups} × ${size}`;
  const total = groups * size;

  if (slot === 9) {
    const shown = r.int(2, groups - 1);
    const rest = groups - shown;
    const prefix = repeat(size, shown);
    return {
      key, display: `${product} = ${prefix} + (□ × ${size})`,
      prompt: 'What number goes in the box?',
      answer: String(rest),
      hint: 'Each number added on its own stands for one group. How many groups are still needed?',
      workedSteps: [
        { text: `There are ${groups} groups of ${size}. The first ${shown} groups are written as a sum.`, equation: `${prefix} = ${shown * size}` },
        { text: 'Count the groups that still belong in the brackets.', equation: `${groups} − ${shown} = ${rest}` },
        { text: 'Check that both sides give the same total.', equation: `${prefix} + (${rest} × ${size}) = ${total}` },
      ],
      explanation: `The box counts groups. After writing out ${shown} of the ${groups} groups, we need ${rest} more.`,
    };
  }

  const toProduct = slot >= 7;
  const answer = toProduct ? product : sum;
  const wrong = toProduct
    ? [`${groups} × ${size - 1}`, `${size} × ${size}`, `${groups} + ${size}`]
    : [repeat(size, groups + 1), repeat(groups, groups), repeat(size, groups, ' × ')];
  return {
    key, display: toProduct ? sum : slot % 2 ? product : `${groups} groups of ${size}`,
    prompt: toProduct ? 'Which multiplication matches this sum?' : 'Which sum counts these groups?',
    answer, choices: r.shuffle([answer, ...wrong]),
    hint: toProduct ? 'Count the numbers being added. What number is repeated?' : 'Write one number for each group. What number goes in every group?',
    workedSteps: [
      { text: toProduct ? `Count the addends: ${size} appears ${groups} times.` : `There are ${groups} groups, with ${size} in each group.` },
      { text: toProduct ? 'Multiply the number of groups by the size of one group.' : 'Add the group size once for each group.', equation: toProduct ? `${sum} = ${product}` : `${product} = ${sum}` },
      { text: 'Both ways count the same total.', equation: `${product} = ${total}` },
    ],
    explanation: `Adding ${size} once for each of the ${groups} groups gives ${total}. That is why ${sum} and ${product} match.`,
  };
}
