import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-numbers-within-strict-bounds',
  level: 1,
  title: 'Find the numbers that fit',
  objective: 'Choose the listed whole numbers that meet every stated bound.',
  skillIds: ['P1.S.WN.04'],
  canonicalPatternId: 'numbers-within-strict-bounds',
};

function consecutive(start: number, count: number): number[] {
  return Array.from({ length: count }, (_, offset) => start + offset);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(1, 15);
  const lower = rng.int(16, 72);
  const upper = lower + rng.int(7, 19);

  if (variant === 15) {
    const match = rng.int(upper - 12, upper - 1);
    const larger = rng.shuffle(consecutive(upper + 1, 5)).slice(0, 2);
    const choices = rng.shuffle([match, upper, ...larger]).map(String);
    const workedSteps = [
      { text: `One less than ${upper} is ${upper - 1}. This is the largest number we could choose.` },
      { text: `Only ${match} fits among the choices.`, equation: `${match} < ${upper}` },
    ];
    return {
      key,
      prompt: `Choose a number less than ${upper}.`,
      choices,
      answer: String(match),
      hint: `Look for a number you say before ${upper} when you count.`,
      workedSteps,
      explanation: `${match} comes before ${upper} when you count. All the other choices are ${upper} or greater.`,
    };
  }

  const pair = variant <= 7;
  const matches = rng.shuffle(consecutive(lower + 1, upper - lower - 1)).slice(0, pair ? 2 : 1);
  const smaller = rng.shuffle(consecutive(lower - 5, 5));
  const larger = rng.shuffle(consecutive(upper + 1, 5));
  const extra = rng.pick([lower, upper, smaller[1], larger[1]]);
  const row = rng.shuffle([...matches, smaller[0], larger[0], extra]);
  const labels = row.map(String);
  const aboveLower = row.filter(value => value > lower);
  const matchText = matches.join(' and ');
  const workedSteps = [
    { text: `First keep the numbers greater than ${lower}: ${aboveLower.join(', ')}.` },
    { text: `Now keep only those less than ${upper}. That leaves ${matchText}.`,
      equation: matches.map(value => `${lower} < ${value} < ${upper}`).join('    ') },
  ];
  return {
    key,
    prompt: pair
      ? `Pick the two numbers that are greater than ${lower} and less than ${upper}.`
      : `Which number in the row is greater than ${lower} and less than ${upper}?`,
    ...(pair
      ? { structuredResponse: { kind: 'named-pair' as const, options: labels } }
      : { display: labels.join(' · ') }),
    answer: pair ? JSON.stringify(matches.map(String)) : String(matches[0]),
    hint: `Start with the numbers that come after ${lower} when you count. Which of those come before ${upper}?`,
    workedSteps,
    explanation: workedSteps.map(step => step.text).join(' '),
  };
}
