import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1s-rag-consecutive-numbers',
  level: 1 as const,
  title: 'Count in ones',
  objective: 'Find the number just before a given number or the only whole number between two bounds.',
  skillIds: ['P1.S.WN.01', 'P1.S.WN.04'],
  canonicalPatternId: 'consecutive-numbers',
};

// Keep both endpoints within 100 and vary the intervals from the examples.
const middleNumbers = Array.from({ length: 99 }, (_, i) => i + 1)
  .filter(value => ![6, 30, 51].includes(value));

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const before = rng.chance(2 / 3);
  const answer = before ? rng.int(0, 99) : rng.pick(middleNumbers);
  const upper = answer + 1;
  const lower = answer - 1;
  const prompt = before
    ? `Count in ones. What number do you say just before ${upper}?`
    : `Count in ones from ${lower} to ${upper}. Which number do you say in between?`;
  const question: Question = {
    key,
    prompt,
    answer: String(answer),
    hint: before ? `Start at ${upper} and take one step back.` : `Start at ${lower} and take one step forward.`,
    workedSteps: [
      before
        ? { text: `Count back one from ${upper}.`, equation: `${upper} − 1 = ${answer}` }
        : { text: `Count on one from ${lower}.`, equation: `${lower} + 1 = ${answer}` },
      { text: `Check by counting on one from ${answer}. You reach ${upper}.`, equation: `${answer} + 1 = ${upper}` },
    ],
    explanation: before
      ? `Counting back one from ${upper} gives ${answer}.`
      : `The count goes ${lower}, ${answer}, ${upper}. You say ${answer} in between.`,
  };
  if (rng.chance(0.5)) {
    const nearby = [-1, 1, -2, 2, -3, 3].map(offset => answer + offset)
      .filter(value => value >= 0 && value <= 100);
    question.choices = rng.shuffle([answer, ...nearby.slice(0, 3)]).map(String);
  }
  return question;
}
