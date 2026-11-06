import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragDurationIncreases';

function solveFromGivens(lines: readonly string[]) {
  const story = lines.join(' ');
  const start = /Mei spent (\d+) h (\d+) min building a model boat\./.exec(story);
  const first = /Ravi worked on his boat for (\d+) minutes longer than Mei did\./.exec(story);
  const second = /Ravi worked on his boat for (\d+) minutes less than Lina did\./.exec(story);
  if (!start || !first || !second) throw new Error('Missing duration or comparison in the story');

  const startHours = Number(start[1]);
  const startMinutes = Number(start[2]);
  const firstGap = Number(first[1]);
  const secondGap = Number(second[1]);
  const minuteSum = startMinutes + firstGap + secondGap;
  const hours = startHours + Math.floor(minuteSum / 60);
  const minutes = minuteSum % 60;
  // Check part (b) by subtracting the two completed durations.
  const difference = (hours - startHours) * 60 + minutes - startMinutes;
  return { fields: [String(hours), String(minutes), String(difference)], firstGap, secondGap,
    carriesOnFirstIncrease: startMinutes + firstGap >= 60 };
}

test('both answers follow from the visible comparisons across seeds and indices', () => {
  const stories = new Set<string>();
  const firstIncreaseCarries = new Set<boolean>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const lines = q.context ?? [];
      const solved = solveFromGivens(lines);
      const expected = JSON.stringify(solved.fields);
      expect(solved.firstGap).toBeGreaterThan(0);
      expect(solved.secondGap).toBeGreaterThan(0);
      expect(Number(solved.fields[2])).toBeLessThan(60);
      expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [
        { label: '(a) Lina’s time (whole hours)' },
        { label: '(a) Lina’s time (minutes left over)' },
        { label: '(b) Extra time compared with Mei (minutes)' },
      ] });
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      const [hours, minutes, extra] = solved.fields;
      expect(correctAnswer(q, JSON.stringify([hours, minutes]))).toBe(false);
      expect(correctAnswer(q, JSON.stringify([hours, minutes, String(solved.firstGap)]))).toBe(false);
      expect(correctAnswer(q, JSON.stringify([hours, String(Number(minutes) + 1), extra]))).toBe(false);
      stories.add(lines.join(' '));
      firstIncreaseCarries.add(solved.carriesOnFirstIncrease);
    }
  }
  expect(stories.size).toBeGreaterThan(20);
  expect(firstIncreaseCarries.size).toBe(2);
});

test('the default index reproduces index zero and a session varies its givens', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const stories = Array.from({ length: 12 }, (_, index) => makeRagQuestion(17, index).context?.join(' '));
  expect(new Set(stories).size).toBeGreaterThan(1);
});
