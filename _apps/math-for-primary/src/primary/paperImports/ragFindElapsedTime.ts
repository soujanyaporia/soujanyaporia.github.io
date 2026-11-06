import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { elapsedClocks } from './ragElapsedTimeClocks';

export const RAG_PATTERN = {
  id: 'p2-rag-find-elapsed-time',
  level: 2 as const,
  title: 'How many minutes passed?',
  objective: 'Find a duration in minutes by reading two clocks or following the minute hand clockwise.',
  skillIds: ['P2.S.TIME.01', 'P2.S.TIME.02'],
  canonicalPatternId: 'p2-find-elapsed-time',
};

const dialSlots = Array.from({ length: 12 }, (_, i) => i);
const durations = Array.from({ length: 11 }, (_, i) => (i + 1) * 5);
const reading = (time: number) => `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;

function choices(rng: Rng, minutes: number, endMinutes: number) {
  const candidates = [endMinutes, minutes + 5, minutes - 5, 60 - minutes, ...rng.shuffle(durations)];
  const wrong = [...new Set(candidates)].filter(n => n !== minutes && durations.includes(n));
  return rng.shuffle([minutes, ...wrong.slice(0, 3)]).map(String);
}

function clockQuestion(key: string, rng: Rng, multipleChoice: boolean): Question {
  const hour = rng.int(7, 11);
  // Keep both hands readable, even when the short hand is close to the next hour.
  const slots = dialSlots.filter(slot => {
    const gap = Math.abs(slot - (hour + slot / 12));
    return Math.min(gap, 12 - gap) >= 0.5;
  });
  const first = multipleChoice ? rng.pick(slots.slice(0, -1).filter(n => n > 0)) : 0;
  const last = rng.pick(slots.filter(n => n > first));
  const start = hour * 60 + 5 * first;
  const finish = hour * 60 + 5 * last;
  const minutes = finish - start;
  const workedSteps = [
    { text: 'Read the short hand for the hour and the long hand for the minutes.',
      equation: `Start: ${reading(start)}. Finish: ${reading(finish)}.` },
    { text: `Both times are in the same hour. Count on from ${5 * first} minutes past to ${5 * last} minutes past.`,
      equation: `${5 * last} − ${5 * first} = ${minutes} minutes` },
  ];
  return {
    key,
    context: ['The clocks show when a puppet show began and ended one morning.'],
    prompt: 'How many minutes did the puppet show last?',
    picture: elapsedClocks(start, finish),
    answer: String(minutes),
    unit: 'minutes',
    ...(multipleChoice ? { choices: choices(rng, minutes, last * 5) } : {}),
    hint: 'Start at the long hand on the first clock. Count in fives to its place on the second clock.',
    workedSteps,
    explanation: `From ${reading(start)} to ${reading(finish)} is ${minutes} minutes.`,
  };
}

function handQuestion(key: string, rng: Rng): Question {
  const first = rng.int(1, 12);
  const last = rng.pick(dialSlots.map(n => n + 1).filter(n => n !== first && !(first === 4 && n === 9)));
  const gaps = (last - first + 12) % 12;
  const route = Array.from({ length: gaps + 1 }, (_, i) => (first - 1 + i) % 12 + 1);
  const minutes = gaps * 5;
  const count = `${gaps} ${gaps === 1 ? 'gap' : 'gaps'}`;
  const workedSteps = [
    { text: 'Trace the minute hand clockwise. Count one gap each time it reaches the next number.',
      equation: `${route.join(' → ')} (${count})` },
    { text: 'Each gap takes 5 minutes.', equation: `${gaps} × 5 = ${minutes} minutes` },
  ];
  return {
    key,
    context: [`The long hand of a clock starts at ${first}. It moves clockwise until it first reaches ${last}.`],
    prompt: 'How many minutes pass while the hand moves?',
    answer: String(minutes),
    unit: 'minutes',
    choices: choices(rng, minutes, (last % 12) * 5),
    hint: 'Count the gaps you pass on the clock. Each gap takes 5 minutes.',
    workedSteps,
    explanation: `The hand crosses ${count} to reach ${last}, so ${minutes} minutes pass.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = (hashString(String(seed)) + (index >>> 0)) % 3;
  return form === 2 ? handQuestion(key, rng) : clockQuestion(key, rng, form === 0);
}
