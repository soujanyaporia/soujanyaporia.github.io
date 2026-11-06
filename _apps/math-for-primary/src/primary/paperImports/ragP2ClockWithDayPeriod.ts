import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-clock-with-day-period',
  level: 2 as const,
  title: 'Tell the time of day',
  objective: 'Read both clock hands and use a morning or afternoon clue to write the time with am or pm.',
  skillIds: ['P2.S.TIME.01', 'P1.S.TIME.01'],
  canonicalPatternId: 'p2-read-analogue-clock-with-day-period',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const morning = rng.pick([true, false]);
  const period = morning ? 'morning' : 'afternoon';
  const suffix = morning ? 'am' : 'pm';
  const hour = morning ? rng.int(7, 11) : rng.pick([1, 2, 4, 5]);
  // Keep the long hand clear of the two numerals around the short hand.
  const dialNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const longHand = rng.pick(dialNumbers.filter(n => n !== hour && n !== hour + 1));
  const minutes = longHand * 5;
  const answer = `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
  const workedSteps = [
    { text: `The short hand is between ${hour} and ${hour + 1}. It has passed ${hour}, so the hour is ${hour}.` },
    { text: `Count by fives from 12 to ${longHand}, where the long hand points.`, equation: `${longHand} × 5 = ${minutes} minutes` },
    { text: `It is ${period}, so use ${suffix}.`, equation: answer },
  ];

  return {
    key,
    context: [`Mira begins a drawing in the ${period}. The clock shows when she begins.`],
    prompt: 'What time does Mira begin her drawing? Write it like 8:00 am or 8:00 pm.',
    picture: { type: 'clock', minutes: hour * 60 + minutes },
    answer,
    hint: 'Find the hour the short hand has passed. Count the minutes with the long hand. Look in the story for the time of day.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
