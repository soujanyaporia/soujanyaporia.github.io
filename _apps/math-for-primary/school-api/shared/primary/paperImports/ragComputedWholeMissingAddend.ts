import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-computed-whole-missing-addend',
  level: 1,
  title: 'Find the other number in the sum',
  objective: 'Work out the total on one side, then find the addend that makes both sides equal.',
  skillIds: ['P1.S.AS.03', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-computed-whole-missing-addend',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['increase', 'subtraction', 'spoken equality'] as const);
  const increase = form === 'increase';
  const start = increase ? 10 * rng.int(3, 6) + rng.int(3, 9) : rng.int(13, 18);
  const change = increase ? 10 : rng.int(2, 6);
  const total = increase ? start + change : start - change;
  const largestKnownPart = increase ? Math.min(6, start % 10) : Math.min(7, total - 2);
  const knownPart = rng.int(2, largestKnownPart);
  const missing = total - knownPart;
  const sum = `${knownPart} + □`;
  const sign = increase ? '+' : '−';
  let display = `${sum} = ${change} more than ${start}`;
  if (!increase) {
    const equals = form === 'subtraction' ? '=' : 'is equal to';
    display = `${start} − ${change} ${equals} ${sum}`;
  }

  const workedSteps = [
    { text: 'Find the total that both sides must have.', equation: `${start} ${sign} ${change} = ${total}` },
    { text: `Take ${knownPart} away from the total to find the other part.`, equation: `${total} − ${knownPart} = ${missing}` },
    { text: 'Put the number in the box and check the sum.', equation: `${knownPart} + ${missing} = ${total}` },
  ];

  return {
    key,
    prompt: increase ? 'What number goes in the box?' : 'Choose the number that belongs in the box.',
    display,
    answer: String(missing),
    ...(increase ? {} : { choices: rng.shuffle([missing, total, start, missing + 1].map(String)) }),
    hint: 'Start with the side that has no box. What must the two parts add up to?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: { op: '-', a: { op: increase ? '+' : '-', a: start, b: change }, b: knownPart },
  };
}
