import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2EventCuedFinishTime';

function solveStory(story: string) {
  const start = /(\d+) o’clock/.exec(story);
  const elapsed = /(\d+) minutes later/.exec(story);
  const morning = story.includes('breakfast');
  const evening = story.includes('dinner');
  if (!start || !elapsed || morning === evening) throw new Error('Expected a whole hour, a duration and one meal cue');

  const hour = Number(start[1]);
  const minutes = Number(elapsed[1]);
  const startInMinutes = ((hour % 12) + (evening ? 12 : 0)) * 60;
  const end = startInMinutes + minutes;
  const endHour = Math.floor(end / 60) % 24;
  const clock = `${endHour % 12 || 12}:${String(end % 60).padStart(2, '0')}`;
  const period = endHour < 12 ? 'am' : 'pm';
  return { hour, minutes, clock, period, expected: `${clock} ${period}` };
}

test('the visible hour, elapsed minutes and meal determine the graded time', () => {
  const periodsByClock = new Map<string, Set<string>>();
  let sawSingleDigitMinutes = false;
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      expect(story).not.toMatch(/\b[ap]\.?m\b/i);
      const { minutes, clock, period, expected } = solveStory(story);
      expect(minutes).toBeGreaterThan(0);
      expect(minutes).toBeLessThan(60);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, clock)).toBe(false);
      expect(correctAnswer(q, `${clock} ${period === 'am' ? 'pm' : 'am'}`)).toBe(false);
      const periods = periodsByClock.get(clock) ?? new Set<string>();
      periods.add(period);
      periodsByClock.set(clock, periods);
      if (minutes < 10) sawSingleDigitMinutes = true;
    }
  }
  expect(sawSingleDigitMinutes).toBe(true);
  expect([...periodsByClock.values()].some(periods => periods.size === 2)).toBe(true);
});
