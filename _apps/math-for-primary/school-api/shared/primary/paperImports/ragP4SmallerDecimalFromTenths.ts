import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-smaller-decimal-from-tenths',
  level: 4,
  title: 'Find the smaller decimal',
  objective: 'Use a difference given as a decimal or a count of tenths to find a smaller number.',
  skillIds: ['P4.S.DEC.05', 'P4.S.DEC.01'],
  canonicalPatternId: 'p4-smaller-decimal-from-tenths-difference',
};

const decimal = (hundredths: number) => (hundredths / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const namedTenths = rng.int(1, 3) === 1;
  const tenths = rng.pick([12, 14, 16, 18, 21, 23, 25, 27]);
  const whole = namedTenths ? rng.int(210, 390) : rng.int(5, 9);
  const start = whole * 100 + rng.int(0, 9) * 10 + rng.int(1, 9);
  const gap = tenths * 10; // Both start and gap are in hundredths.
  const shortGap = (tenths / 10).toFixed(1);
  const clue = namedTenths ? `${tenths} tenths` : shortGap;
  const answer = decimal(start - gap);

  const workedSteps = [
    {
      text: namedTenths
        ? 'Ten tenths make one whole. Write the difference as a decimal.'
        : 'Write the difference with two decimal places so the tenths line up.',
      equation: namedTenths
        ? `${clue} = ${shortGap} = ${decimal(gap)}`
        : `${shortGap} = ${decimal(gap)}`,
    },
    {
      text: 'Take the difference away from the given number to find the smaller number.',
      equation: `${decimal(start)} − ${decimal(gap)} = ${answer}`,
    },
  ];

  return {
    key,
    prompt: `My number is ${clue} smaller than ${decimal(start)}. ${namedTenths ? 'Write my number.' : 'Choose my number.'}`,
    answer,
    ...(namedTenths ? {} : {
      // The alternatives use addition or read the tenths as hundredths.
      choices: rng.shuffle([start - gap, start + gap, start - tenths, start + tenths].map(decimal)),
    }),
    hint: 'Think about how far to move back from the given number. One tenth is ten hundredths.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: { op: '/', a: { op: '-', a: start, b: gap }, b: 100 },
  };
}
