import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-overnight-and-noon',
  level: 3,
  title: 'How long did it last?',
  objective: 'Count through midnight to compare two finish times, or count through noon to find a duration in minutes.',
  skillIds: ['P3.S.TIME.02', 'P3.S.TIME.03'],
  canonicalPatternId: 'p3-find-elapsed-time',
};

const NOON = 12 * 60;
const DAY = 24 * 60;
const twoDigits = (n: number) => String(n).padStart(2, '0');

function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60) % 24;
  return `${hour % 12 || 12}:${twoDigits(minutes % 60)} ${hour < 12 ? 'am' : 'pm'}`;
}

function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function overnight(key: string, rng: Rng): Question {
  const start = rng.int(20, 22) * 60 + rng.pick([20, 25, 35, 50, 55]);
  const owlDuration = rng.int(4, 6) * 60 + rng.pick([35, 45, 50, 55]);
  const delay = rng.pick([30, 35, 45, 50]);
  const untilMidnight = DAY - start;
  const owlAfterMidnight = owlDuration - untilMidnight;
  const foxAfterMidnight = owlAfterMidnight + delay;
  const foxDuration = untilMidnight + foxAfterMidnight;
  const stopHour = twoDigits(Math.floor(owlAfterMidnight / 60));
  const stopMinute = twoDigits(owlAfterMidnight % 60);
  const stopReading = `${stopHour}:${stopMinute}`;

  const workedSteps = [
    { text: '(a) Count from the start to midnight.', equation: `${clock(start)} to midnight = ${duration(untilMidnight)}` },
    { text: 'Take that time away from the owl camera’s recording time. The rest comes after midnight.', equation: `${duration(owlDuration)} − ${duration(untilMidnight)} = ${duration(owlAfterMidnight)}` },
    { text: 'Count the remaining hours and minutes from midnight on Tuesday.', equation: `Midnight + ${duration(owlAfterMidnight)} = ${clock(owlAfterMidnight)} (${stopReading} on the 24-hour clock)` },
    { text: '(b) Count on from the owl camera’s stop time to the fox camera’s stop time.', equation: `${clock(owlAfterMidnight)} + ${delay} min = ${clock(foxAfterMidnight)}` },
    { text: 'Both cameras started together. Join the time before midnight to the time from midnight until the fox camera stops.', equation: `${duration(untilMidnight)} + ${duration(foxAfterMidnight)} = ${duration(foxDuration)}` },
  ];

  return {
    key,
    context: [
      `At a wildlife park, the owl camera and the fox camera both start recording at ${clock(start)} on Monday evening. All times use the same clock.`,
      `The owl camera records for ${duration(owlDuration)}. The fox camera stops ${delay} minutes after the owl camera. Both record without a break.`,
    ],
    prompt: '(a) What time does the owl camera stop? Use the 24-hour clock.\n(b) How long does the fox camera record? Give hours and minutes.',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: '(a) Stop time — hour (24-hour clock)' },
        { label: '(a) Stop time — minute' },
        { label: '(b) Recording time — hours' },
        { label: '(b) Recording time — minutes' },
      ],
    },
    answer: JSON.stringify([stopHour, stopMinute, String(Math.floor(foxDuration / 60)), String(foxDuration % 60)]),
    hint: 'How much time passes before midnight? For the fox camera, think about what its later stop means when both cameras started together.',
    workedSteps,
    explanation: `The owl camera stops at ${stopReading} on Tuesday. Since both cameras began together, the fox camera records for ${delay} minutes longer: ${duration(owlDuration)} + ${delay} min = ${duration(foxDuration)}.`,
  };
}

function acrossNoon(key: string, rng: Rng): Question {
  const start = rng.int(9, 11) * 60 + rng.pick([20, 35, 40, 50]);
  const finish = rng.int(14, 15) * 60 + rng.pick([25, 35, 45, 55]);
  const beforeNoon = NOON - start;
  const afterNoon = finish - NOON;
  const total = beforeNoon + afterNoon;

  return {
    key,
    context: [`The school book fair opens at ${clock(start)} and closes at ${clock(finish)} on the same day. It stays open the whole time.`],
    prompt: 'For how many minutes is the book fair open?',
    unit: 'minutes',
    answer: String(total),
    hint: 'Count from opening time to noon, then from noon to closing time. Count each hour as 60 minutes.',
    workedSteps: [
      { text: 'Count from opening time to noon.', equation: `${clock(start)} to noon = ${duration(beforeNoon)} = ${beforeNoon} min` },
      { text: 'Count from noon to closing time.', equation: `Noon to ${clock(finish)} = ${duration(afterNoon)} = ${afterNoon} min` },
      { text: 'Add the two intervals in minutes.', equation: `${beforeNoon} min + ${afterNoon} min = ${total} min` },
    ],
    explanation: `The fair is open for ${beforeNoon} minutes before noon and ${afterNoon} minutes after noon, giving ${total} minutes altogether.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  return (seed + index) % 2 === 0 ? overnight(key, rng) : acrossNoon(key, rng);
}
