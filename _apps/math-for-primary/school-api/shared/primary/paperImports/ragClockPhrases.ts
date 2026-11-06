import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-clock-phrases',
  level: 3,
  title: 'Minutes past and minutes to',
  objective: 'Read both clock hands and tell the time in minutes past the hour or minutes to the next hour.',
  skillIds: ['P2.S.TIME.01'],
  canonicalPatternId: 'p3-analogue-clock-minutes-past-and-to',
} as const;

// Minutes from 12 o’clock. Reserve the example faces so practice uses fresh times.
const reservedFaces = new Set([35, 290, 545]);
const dialHours = Array.from({ length: 12 }, (_, hour) => hour);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['past-choice', 'to-choice', 'to-fields'] as const);
  const past = mode === 'past-choice';
  const distance = 5 * rng.int(1, 5);
  const minute = past ? distance : 60 - distance;
  const readableHours = dialHours.filter(hour => {
    const time = hour * 60 + minute;
    const angle = Math.abs(time / 2 - minute * 6);
    return Math.min(angle, 360 - angle) >= 15 && !reservedFaces.has(time);
  });
  const hourIndex = rng.pick(readableHours);
  const currentHour = hourIndex || 12;
  const nextHour = hourIndex + 1;
  const namedHour = past ? currentHour : nextHour;
  const direction = past ? 'past' : 'to';
  const phrase = `${distance} minutes ${direction} ${namedHour}`;
  const mark = minute / 5;
  const workedSteps = [
    { text: `The long hand points to ${mark}. Count in fives from 12 to find the minutes past the hour.`, equation: `${mark} × 5 = ${minute} minutes` },
    { text: `The short hand is between ${currentHour} and ${nextHour}. It has passed ${currentHour} and is moving towards ${nextHour}.` },
    ...(past ? [] : [{ text: `Find how many minutes are left until ${nextHour} o’clock.`, equation: `60 − ${minute} = ${distance} minutes` }]),
    { text: `The clock shows ${phrase}.` },
  ];
  const common = {
    key,
    picture: { type: 'clock' as const, minutes: hourIndex * 60 + minute },
    hint: 'Follow the long hand to count minutes. Use the short hand to see which hour has passed and which hour comes next.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, 'equation' in step ? step.equation : ''].filter(Boolean).join(' ')).join(' '),
  };

  if (mode === 'to-fields') {
    return {
      ...common,
      prompt: 'Read the clock. Fill in both numbers: ___ minutes to ___.',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Minutes until the next hour', secondLabel: 'Next hour on the clock' },
      answer: JSON.stringify([String(distance), String(namedHour)]),
    };
  }

  const otherDistance = distance === 25 ? 20 : distance + 5;
  return {
    ...common,
    prompt: 'Which phrase tells the time on this clock?',
    answer: phrase,
    choices: rng.shuffle([
      phrase,
      `${distance} minutes ${past ? 'to' : 'past'} ${namedHour}`,
      `${distance} minutes ${direction} ${past ? nextHour : currentHour}`,
      `${otherDistance} minutes ${direction} ${namedHour}`,
    ]),
  };
}
