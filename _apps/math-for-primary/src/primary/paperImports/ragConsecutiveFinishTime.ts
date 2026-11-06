import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-consecutive-finish-time',
  level: 3,
  title: 'When does puppet practice finish?',
  objective: 'Count on through each activity and any break to find the finish time.',
  skillIds: ['P3.S.TIME.02'],
  canonicalPatternId: 'p3-find-a-start-or-finish-time',
};

function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, '0');
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? 'am' : 'pm'}`;
}

function duration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const extra = minutes % 60;
  return [hours && `${hours} h`, extra && `${extra} min`].filter(Boolean).join(' ');
}

type Stage = { minutes: number; activity: string; instruction: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const withBreak = rng.int(0, 1) === 1;
  const startHour = withBreak ? rng.int(9, 11) : rng.int(13, 14);
  const start = startHour * 60 + rng.pick([5, 15, 25, 35, 40, 55]);
  const extraMinutes = rng.pick([20, 25, 35, 40]);
  const making = withBreak ? rng.pick([65, 70, 80]) : rng.int(1, 2) * 60 + extraMinutes;
  // In the two-activity form, the two minute parts together make one hour.
  const practice = withBreak ? rng.pick([35, 40, 45, 50]) : 60 + (60 - extraMinutes);
  const stages: Stage[] = [
    { minutes: making, activity: 'making puppets', instruction: 'Count on to find when the puppets were ready.' },
  ];
  if (withBreak) {
    stages.push({ minutes: rng.pick([10, 15, 20, 25]), activity: 'having a snack break', instruction: 'Include the snack break to find when practice began.' });
  }
  stages.push({ minutes: practice, activity: 'practising their show', instruction: 'Count on through practice to find the finish time.' });

  const context = [`Puppet club began at ${clock(start)}. The children did these things one after another.`];
  let elapsed = start;
  const workedSteps = stages.map(stage => {
    const from = clock(elapsed);
    const length = duration(stage.minutes);
    context.push(`They spent ${length} ${stage.activity}.`);
    elapsed += stage.minutes;
    return { text: stage.instruction, equation: `${from} + ${length} = ${clock(elapsed)}` };
  });
  const finish = clock(elapsed);
  return {
    key,
    context,
    prompt: withBreak
      ? 'What time did the children finish practising? Write the time with am or pm, like 8:05 am.'
      : 'What time did the children finish practising? Enter the hour and minutes, like 4:05.',
    answer: withBreak ? finish : finish.split(' ')[0],
    ...(withBreak ? {} : { unit: 'pm' }),
    hint: 'Start with the time the club began. After each activity, use the new clock time to start the next one.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
