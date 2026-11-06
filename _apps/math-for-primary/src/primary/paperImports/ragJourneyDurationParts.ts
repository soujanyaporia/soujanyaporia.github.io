import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-journey-duration-parts',
  level: 3 as const,
  title: 'A coach trip with a stop',
  objective: 'Convert a ride time to minutes and add both rides and the stop to find the whole trip time.',
  skillIds: ['P3.S.TIME.02', 'P2.S.TIME.02'],
  canonicalPatternId: 'p3-combine-or-separate-duration-parts',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const shortRide = rng.pick([20, 25, 30, 35, 40, 50]);
  const stop = rng.pick([5, 15, 20]);
  const hours = rng.int(1, 2);
  const extraMinutes = rng.pick([10, 15, 20, 30, 35, 40]);
  const longRide = hours * 60 + extraMinutes;
  const longLabel = `${hours} h ${extraMinutes} min`;
  const shortLabel = `${shortRide} min`;
  const longRideFirst = rng.chance(0.5);
  const gaps = longRideFirst ? [longLabel, shortLabel] : [shortLabel, longLabel];
  const firstRide = longRideFirst ? longRide : shortRide;
  const secondRide = longRideFirst ? shortRide : longRide;
  const ridingTime = firstRide + secondRide;
  const total = ridingTime + stop;

  const workedSteps = [
    {
      text: 'Write the longer ride in minutes. Each hour has 60 minutes.',
      equation: `${hours} h ${extraMinutes} min = (${hours} × 60 + ${extraMinutes}) min = ${longRide} min`,
    },
    {
      text: 'Add the two rides to find the time the coach spends on the road.',
      equation: `${firstRide} min + ${secondRide} min = ${ridingTime} min`,
    },
    {
      text: 'The class also spends time at the park. Add that stop once.',
      equation: `${ridingTime} min + ${stop} min = ${total} min`,
    },
  ];

  return {
    key,
    context: [`A class takes a coach from school to a campsite. The coach stops at the park for ${stop} minutes before continuing.`],
    picture: {
      type: 'paper',
      layout: 'timeline',
      heading: 'Time spent on each ride',
      points: [{ label: 'School' }, { label: 'Park' }, { label: 'Campsite' }],
      gaps,
    },
    prompt: 'How many minutes pass from the time the coach leaves school until it reaches the campsite?',
    unit: 'minutes',
    answer: String(total),
    hint: 'First change the hours to minutes. What happens between the two rides?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
