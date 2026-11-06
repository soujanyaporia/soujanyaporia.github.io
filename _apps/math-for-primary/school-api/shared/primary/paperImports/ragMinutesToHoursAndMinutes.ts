import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-minutes-to-hours-and-minutes',
  level: 3,
  title: 'Find the whole hours and minutes left over',
  objective: 'Group a duration into whole hours and keep track of the minutes left over.',
  skillIds: ['P2.S.TIME.02', 'P3.S.MD.02'],
  canonicalPatternId: 'p3-convert-duration-units',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const hours = rng.int(2, 5);
  const minutes = rng.pick([5, 10, 15, 20, 30, 40, 45, 50, 55]);
  const minutesInWholeHours = hours * 60;
  const total = minutesInWholeHours + minutes;
  const workedSteps = [
    {
      text: `Each hour has 60 minutes. ${hours} whole hours fit.`,
      equation: `${hours} × 60 = ${minutesInWholeHours} minutes`,
    },
    {
      text: 'Take away the minutes in those whole hours.',
      equation: `${total} − ${minutesInWholeHours} = ${minutes} minutes`,
    },
  ];

  return {
    key,
    prompt: `A train ride lasts ${total} minutes. How many whole hours is that, and how many minutes are left over?`,
    structuredResponse: { kind: 'number-pair', firstLabel: 'Hours', secondLabel: 'Minutes' },
    answer: JSON.stringify([String(hours), String(minutes)]),
    hint: 'Count in groups of 60 minutes. Stop when there are fewer than 60 minutes left.',
    workedSteps,
    explanation: `The ${minutes} minutes left over are less than one hour, so the ride lasts ${hours} h ${minutes} min.`,
  };
}
