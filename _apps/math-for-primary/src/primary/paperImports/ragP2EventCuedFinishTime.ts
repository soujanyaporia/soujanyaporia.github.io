import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-event-cued-finish-time',
  level: 2,
  title: 'What time does the meal finish?',
  objective: 'Count on in minutes from a whole hour and use the event to choose am or pm.',
  skillIds: ['P2.S.TIME.01', 'P1.S.TIME.01'],
  canonicalPatternId: 'p2-find-a-start-or-finish-time',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const hour = rng.pick([7, 8]);
  const minutes = rng.pick([5, 10, 15, 25, 30, 35]);
  const breakfast = rng.pick([true, false]);
  const scene = breakfast
    ? `At the start of the day, Lina sits down for breakfast at ${hour} o’clock.`
    : `At the end of the day, Lina sits down for dinner at ${hour} o’clock.`;
  const period = breakfast ? 'am' : 'pm';
  const periodReason = breakfast
    ? 'Lina is eating breakfast at the start of the day, so use am.'
    : 'Lina is eating dinner at the end of the day, so use pm.';
  const finish = `${hour}:${String(minutes).padStart(2, '0')}`;
  const answer = `${finish} ${period}`;

  return {
    key,
    prompt: 'What time does Lina finish her meal? Write the time like 3:05 and add am or pm.',
    context: [scene, `She finishes her meal ${minutes} minutes later.`],
    answer,
    hint: 'Start at the whole hour and count forwards. Which meal tells you the time of day?',
    workedSteps: [
      { text: 'Count on from the whole hour. Fewer than 60 minutes pass, so the hour stays the same.', equation: `${hour}:00 + ${minutes} minutes = ${finish}` },
      { text: periodReason, equation: answer },
    ],
    explanation: `${minutes} minutes after ${hour}:00 is ${finish}. ${periodReason} The finish time is ${answer}.`,
  };
}
