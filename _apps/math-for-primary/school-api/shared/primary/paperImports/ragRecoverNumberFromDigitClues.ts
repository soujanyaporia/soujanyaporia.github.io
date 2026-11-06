import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-digit-clues',
  level: 1,
  title: 'Find the number from two clues',
  objective: 'Use clues to find the tens and ones digits and write the two-digit numeral.',
  skillIds: ['P1.S.WN.02', 'P1.S.AS.07'],
  canonicalPatternId: 'p1-recover-number-from-digit-clues',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['separate', 'difference', 'interval']);

  function finish(tens: number, ones: number, context: string[], hint: string, steps: Steps): Question {
    const value = 10 * tens + ones;
    const workedSteps = [...steps, {
      text: `Write ${tens} in the tens place and ${ones} in the ones place.`,
      equation: `${10 * tens} + ${ones} = ${value}`,
    }];
    return {
      key,
      prompt: 'Which two-digit number fits both clues?',
      context,
      answer: String(value),
      hint,
      workedSteps,
      explanation: workedSteps.map(step => step.equation ? `${step.text} ${step.equation}.` : step.text).join(' '),
    };
  }

  if (form === 'separate') {
    const onesStart = rng.int(1, 5);
    const rise = rng.int(3, 4);
    const tensStart = rng.int(5, 8);
    const drop = rng.int(2, 4);
    const ones = onesStart + rise;
    const tens = tensStart - drop;
    return finish(tens, ones, [
      `My ones digit is ${rise} more than ${onesStart}.`,
      `My tens digit is ${drop} less than ${tensStart}.`,
    ], 'Count on for the ones digit. Count back for the tens digit.', [
      { text: 'Find the digit on the right.', equation: `${onesStart} + ${rise} = ${ones}` },
      { text: 'Find the digit on the left.', equation: `${tensStart} − ${drop} = ${tens}` },
    ]);
  }

  if (form === 'difference') {
    const ones = rng.int(0, 5);
    const gap = rng.int(2, 4);
    const tens = ones + gap;
    return finish(tens, ones, [
      `My number ends in ${ones}.`,
      `My tens digit is ${gap} more than my ones digit.`,
    ], 'Start with the last digit. Count on to find the digit to its left.', [
      { text: `The last digit tells us there are ${ones} in the ones place.` },
      { text: `Count on ${gap} to find the tens digit.`, equation: `${ones} + ${gap} = ${tens}` },
    ]);
  }

  const tens = rng.int(3, 8);
  const lower = 10 * tens;
  const upper = lower + 10;
  const digitSum = rng.int(11, tens + 9);
  const ones = digitSum - tens;
  return finish(tens, ones, [
    `My number is greater than ${lower} and less than ${upper}.`,
    `My two digits add up to ${digitSum}.`,
  ], 'Look at the numbers between the two limits. Which digit stays the same?', [
    { text: `The numbers from ${lower + 1} to ${upper - 1} all have ${tens} in the tens place.` },
    { text: 'Take the tens digit away from the digit total to find the ones digit.', equation: `${digitSum} − ${tens} = ${ones}` },
  ]);
}
