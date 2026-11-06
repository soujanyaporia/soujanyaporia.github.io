import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rank-race-durations',
  level: 3,
  title: 'Put the runners in finishing order',
  objective: 'Express three race times in minutes and order the runners from fastest to slowest.',
  skillIds: ['P3.S.TIME.02', 'P2.S.TIME.02'],
  canonicalPatternId: 'p3-compare-or-rank-durations',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const names = rng.shuffle(['Asha', 'Ben', 'Hui', 'Lina', 'Ravi', 'Zara']);
  const longTimes = rng.shuffle([63, 65, 68, 72, 75, 78, 82, 86, 90, 94]);
  const [mixedMinutes, plainMinutes] = longTimes;
  const otherMinutes = rng.pick([42, 46, 50, 54, 58, ...longTimes.slice(2)]);
  const remainder = mixedMinutes - 60;
  const runners = [
    { name: names[0], minutes: mixedMinutes, reading: `1 h ${remainder} min` },
    { name: names[1], minutes: plainMinutes, reading: `${plainMinutes} min` },
    { name: names[2], minutes: otherMinutes, reading: `${otherMinutes} min` },
  ];
  const ranked = [...runners].sort((left, right) => left.minutes - right.minutes);
  const shown = rng.shuffle(runners);
  if (shown.every((runner, position) => runner.name === ranked[position].name)) shown.reverse();
  const finishingOrder = ranked.map(runner => runner.name);

  return {
    key,
    prompt: 'Three children ran the same trail. Put their names in order from fastest to slowest.',
    context: shown.map(runner => `${runner.name}: ${runner.reading}`),
    order: shown.map(runner => runner.name),
    answer: finishingOrder.join(','),
    hint: 'One hour is 60 minutes. Which runner took the fewest minutes?',
    workedSteps: [
      {
        text: `Write ${names[0]}’s time in minutes.`,
        equation: `1 h ${remainder} min = 60 min + ${remainder} min = ${mixedMinutes} min`,
      },
      {
        text: 'Compare the times from shortest to longest.',
        equation: ranked.map(runner => `${runner.minutes} min`).join(' < '),
      },
      {
        text: 'The runner with the shortest time was the fastest. Match each time to its runner.',
        equation: finishingOrder.join(' → '),
      },
    ],
    explanation: `From fastest to slowest, the runners are ${ranked.map(runner => `${runner.name} (${runner.minutes} min)`).join(', ')}.`,
  };
}
