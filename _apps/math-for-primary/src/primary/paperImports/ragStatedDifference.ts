import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-stated-difference',
  level: 1,
  title: 'Find the larger amount',
  objective: 'Use a known count and how many more to find the larger count.',
  skillIds: ['P1.S.AS.03', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'find-a-quantity-from-a-stated-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const round = Math.floor(index / 4);
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${round}`));
  // Keep the two responses to the fan story together, with the same numbers.
  const slot = ((index % 4) + 4) % 4;
  const form = (slot + (r.chance(0.5) ? 2 : 0)) % 4;

  if (form === 3) {
    const start = 10 * r.int(1, 3) + r.int(7, 9);
    const extra = r.pick([4, 6, 7, 8]);
    const nextTen = Math.ceil(start / 10) * 10;
    const rest = extra - (nextTen - start);
    const larger = start + extra;
    const low = 10 * r.int(6, 8) + r.int(6, 9);
    const gap = r.int(5, 8);
    const high = low + gap;
    return {
      key,
      prompt: 'Write a number for each part.',
      context: [`(a) Which number is ${extra} more than ${start}?`, `(b) How much less is ${low} than ${high}?`],
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Larger number', secondLabel: '(b) Difference' },
      answer: JSON.stringify([String(larger), String(gap)]),
      hint: 'In (a), count on from the starting number. In (b), count the steps between the two numbers.',
      workedSteps: [
        { text: `(a) Count on to ${nextTen} first.`, equation: `${start} + ${nextTen - start} = ${nextTen}` },
        { text: `Count on the remaining ${rest}.`, equation: `${nextTen} + ${rest} = ${larger}` },
        { text: '(b) Subtract the smaller number from the larger one to find the gap.', equation: `${high} − ${low} = ${gap}` },
      ],
      explanation: `${larger} is ${extra} more than ${start}. For (b), it takes ${gap} steps to get from ${low} to ${high}.`,
    };
  }

  const known = r.pick([3, 5, 7, 9]);
  const extra = r.pick([2, 3, 5, 7, 9, 10, 11, 13].filter(n => n !== known && known + n <= 20));
  const larger = known + extra;
  const fans = form < 2;
  const context = fans
    ? [`Mei folded ${known} paper fans.`, `Ravi folded ${extra} more paper fans than Mei.`]
    : [`A jar holds ${known} white buttons.`, `There are ${extra} more brown buttons than white buttons in the jar.`];
  const ask = fans ? 'How many paper fans did Ravi fold?' : 'How many brown buttons are in the jar?';
  const sentence = `${known} + ${extra} = ${larger}`;
  const conclusion = fans ? `Ravi folded ${larger} paper fans.` : `There are ${larger} brown buttons in the jar.`;
  const shared = {
    key, context,
    hint: fans ? 'Start with as many fans as Mei folded. What do you need to add for Ravi?' : 'Match one brown button to each white button. Which buttons are still to be counted?',
    workedSteps: [
      { text: fans ? `Ravi folded as many fans as Mei, plus ${extra} extra fans.` : `Match ${known} brown buttons to the white buttons, then count the ${extra} extra brown ones.`, equation: sentence },
      { text: fans ? 'Take away the extra fans to check that the rest matches Mei’s count.' : 'Take away the extra brown buttons to check that the rest matches the white buttons.', equation: `${larger} − ${extra} = ${known}` },
    ],
    explanation: `${sentence}. ${conclusion}`,
  };
  if (form === 1) return { ...shared, prompt: ask, answer: String(larger), unit: 'paper fans' };
  return {
    ...shared,
    prompt: `${ask} Show your answer with a number sentence using the two numbers in the story.`,
    answer: sentence,
    numberSentence: { numbers: r.shuffle([known, extra]), operation: '+', missingResult: true, chooseOperation: true },
  };
}
