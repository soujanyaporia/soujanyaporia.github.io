import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP2ClockWithDayPeriod';

function readVisibleGivens(q: Question) {
  if (q.picture?.type !== 'clock') throw new Error('A clock face is required');
  const dial = q.picture.minutes;
  expect(Number.isInteger(dial)).toBe(true);
  expect(dial).toBeGreaterThanOrEqual(0);
  expect(dial).toBeLessThan(12 * 60);
  const hour = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11][Math.floor(dial / 60)];
  const minute = dial % 60;
  expect(minute % 5).toBe(0);
  const cues = (q.context ?? []).join(' ').match(/\b(morning|afternoon)\b/g) ?? [];
  expect(cues).toHaveLength(1);
  const suffix = cues[0] === 'morning' ? 'am' : 'pm';
  const time = `${hour}:${String(minute).padStart(2, '0')}`;
  return { time, suffix, minute };
}

test('the clock and story together determine the accepted written answer', () => {
  const periods = new Set<string>();
  const minuteReadings = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { time, suffix, minute } = readVisibleGivens(q);
      const expected = `${time} ${suffix}`;
      expect(q.choices).toBeUndefined();
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, time)).toBe(false);
      expect(correctAnswer(q, `${time} ${suffix === 'am' ? 'pm' : 'am'}`)).toBe(false);
      expect(q.workedSteps?.at(-1)?.equation).toBe(expected);
      periods.add(suffix);
      minuteReadings.add(minute);
    }
  }
  expect(periods).toEqual(new Set(['am', 'pm']));
  expect(minuteReadings.has(5)).toBe(true);
  expect(minuteReadings.has(55)).toBe(true);
});

test('repeating a seed and index reproduces the question, while indices vary the visible givens', () => {
  const readings = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    readings.add(JSON.stringify([q.picture, q.context]));
  }
  expect(readings.size).toBeGreaterThan(1);
});
