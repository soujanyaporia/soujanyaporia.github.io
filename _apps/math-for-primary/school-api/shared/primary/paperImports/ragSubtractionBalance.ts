import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-subtraction-balance',
  level: 1,
  title: 'Find what to take away',
  objective: 'Find the number to take away so that both sides give the same answer.',
  skillIds: ['P1.S.AS.03', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-complete-a-subtraction-equation',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const remainder = 10 * rng.int(2, 6);
  const possibleStarts = [30, 40, 50, 60, 70, 80, 90].filter(
    start => start > remainder && start - remainder !== remainder,
  );
  const rightStart = rng.pick(possibleStarts);
  const leftStart = 10 * rng.int(rightStart / 10, 9) + rng.int(3, 9);
  const leftTaken = leftStart - remainder;
  const missing = rightStart - remainder;

  const workedSteps = [
    { text: 'First work out the left side.', equation: `${leftStart} − ${leftTaken} = ${remainder}` },
    { text: `The right side must leave ${remainder} too. Find how much to take away from ${rightStart}.`, equation: `${rightStart} − ${remainder} = ${missing}` },
    { text: `Put ${missing} in the box and check.`, equation: `${rightStart} − ${missing} = ${remainder}` },
  ];
  return {
    key,
    prompt: 'Which number goes in the box to make both sides equal?',
    display: `${leftStart} − ${leftTaken} = ${rightStart} − □`,
    answer: String(missing),
    hint: 'Start on the side with no box. How much is left? The other side must leave that much too.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: { op: '-', a: rightStart, b: { op: '-', a: leftStart, b: leftTaken } },
  };
}
