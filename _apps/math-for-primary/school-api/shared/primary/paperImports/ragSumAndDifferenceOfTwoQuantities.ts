import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-total-from-smaller-count-and-difference',
  level: 2,
  title: 'Count what is in both boxes',
  objective: 'Use the smaller count and the difference to find the larger count, then add both counts.',
  skillIds: ['P2.S.AS.01'],
  canonicalPatternId: 'sum-and-difference-of-two-quantities',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const items = rng.pick(['buttons', 'beads', 'paper clips']);
  const smaller = rng.int(180, 275);
  const maxGap = 1000 - 2 * smaller;
  const sampledGap = rng.chance(0.1) ? maxGap : rng.int(20, maxGap);
  // Keep the difference distinct from the smaller count so each equation choice is different.
  const gap = sampledGap === smaller ? sampledGap - 1 : sampledGap;
  const larger = smaller + gap;
  const total = smaller + larger;
  const comparison = rng.chance(0.5)
    ? `The blue box holds ${gap} more ${items} than the red box.`
    : `The red box holds ${gap} fewer ${items} than the blue box.`;
  const findBlue = `${smaller} + ${gap} = ${larger}`;
  const countBoth = `${smaller} + ${larger} = ${total}`;
  const shared = {
    key,
    context: [`The red box holds ${smaller} ${items}.`, comparison],
    hint: 'Which box holds more? Find its count first, then count both boxes together.',
    workedSteps: [
      { text: `The blue box has ${gap} more ${items} than the red box.`, equation: findBlue },
      { text: 'Add the red box count and the blue box count.', equation: countBoth },
    ],
    explanation: `The blue box holds ${larger} ${items}. Together the boxes hold ${smaller} + ${larger} = ${total} ${items}.`,
  };
  if (rng.int(1, 11) === 1) {
    return {
      ...shared,
      prompt: `Which number sentence adds the counts from both boxes to find the total number of ${items}?`,
      choices: rng.shuffle([countBoth, findBlue, `${smaller} + ${smaller} = ${2 * smaller}`, `${larger} − ${smaller} = ${gap}`]),
      answer: countBoth,
    };
  }
  return {
    ...shared,
    prompt: `How many ${items} are in the two boxes altogether?`,
    answer: String(total),
    unit: items,
  };
}
