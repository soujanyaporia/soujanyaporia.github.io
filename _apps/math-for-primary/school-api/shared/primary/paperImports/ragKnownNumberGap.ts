import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p3-known-number-gap',
  level: 3,
  title: 'Two numbers a known distance apart',
  objective: 'Use the gap and one more clue to find the larger or smaller whole number.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-two-numbers-with-a-known-difference'
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const givenSmaller = ((seed ^ index) & 1) === 0;
  const smaller = givenSmaller ? rng.int(201, 780) : rng.int(305, 485);
  const gap = givenSmaller ? rng.int(24, 96) : rng.int(512, 790);
  const larger = smaller + gap;
  const sum = smaller + larger;
  const equalParts = sum - gap;
  const workedSteps = givenSmaller ? [
    { text: 'Start at the smaller number and add the gap.', equation: `${smaller} + ${gap} = ${larger}` },
    { text: 'Check how far apart the numbers are.', equation: `${larger} − ${smaller} = ${gap}` }
  ] : [
    { text: 'Take the extra part of the larger number out of the sum. This leaves two copies of the smaller number.', equation: `${sum} − ${gap} = ${equalParts}` },
    { text: 'Halve what is left to find one copy.', equation: `${equalParts} ÷ 2 = ${smaller}` }
  ];
  return {
    key,
    context: [
      `My two whole numbers are ${gap} apart.`,
      givenSmaller ? `I chose ${smaller} as my smaller number.` : `Adding my numbers gives ${sum}.`
    ],
    prompt: givenSmaller ? 'What is my larger number?' : 'What is my smaller number?',
    answer: String(givenSmaller ? larger : smaller),
    hint: givenSmaller ? 'Count up from the number you know.' : 'What would the sum be if you took away the extra part of the larger number?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: givenSmaller ? { op: '+', a: smaller, b: gap } : { op: '/', a: { op: '-', a: sum, b: gap }, b: 2 }
  };
}
