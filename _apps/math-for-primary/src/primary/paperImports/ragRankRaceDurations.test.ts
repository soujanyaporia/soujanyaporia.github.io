import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRankRaceDurations';

function readRaceTime(line: string) {
  const match = /^([A-Za-z]+): (?:(\d+) h )?(\d+) min$/.exec(line);
  if (!match) throw new Error(`Cannot read a runner and time from ${line}`);
  const [, name, hours, minutes] = match;
  const hasHours = hours !== undefined;
  if (hasHours) {
    expect(Number(hours)).toBeGreaterThan(0);
    expect(Number(minutes)).toBeGreaterThan(0);
    expect(Number(minutes)).toBeLessThan(60);
  }
  return { name, hasHours, total: Number(hours ?? 0) * 60 + Number(minutes) };
}

test('grades the finishing order calculated from the three displayed readings', () => {
  const mixedTimePositions = new Set<number>();
  for (let seed = -8; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const readings = (question.context ?? []).map(readRaceTime);
      expect(readings).toHaveLength(3);
      expect(new Set(readings.map(row => row.name)).size).toBe(3);
      expect(new Set(readings.map(row => row.total)).size).toBe(3);
      expect(readings.every(row => row.total > 0 && row.total < 120)).toBe(true);
      expect(readings.filter(row => row.hasHours)).toHaveLength(1);
      expect(readings.some(row => !row.hasHours && row.total > 60)).toBe(true);

      // A runner's position is the number of runners who took less time.
      const finishers: string[] = [];
      for (const row of readings) {
        const position = readings.filter(other => other.total < row.total).length;
        finishers[position] = row.name;
        if (row.hasHours) mixedTimePositions.add(position);
      }
      expect([...(question.order ?? [])].sort()).toEqual(readings.map(row => row.name).sort());
      expect(question.order).not.toEqual(finishers);
      expect(question.answer).toBe(finishers.join(','));
      expect(correctAnswer(question, finishers.join(','))).toBe(true);
      expect(correctAnswer(question, [finishers[0], finishers[2], finishers[1]].join(','))).toBe(false);
      expect(correctAnswer(question, finishers.slice(0, 2).join(','))).toBe(false);
    }
  }
  expect([...mixedTimePositions].sort()).toEqual([0, 1, 2]);
});

test('replays a seed and index and varies the visible givens within a session', () => {
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  const variants = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const question = makeRagQuestion(19, index);
    expect(question).toEqual(makeRagQuestion(19, index));
    variants.add(JSON.stringify(question.context));
  }
  expect(variants.size).toBeGreaterThanOrEqual(8);
});
