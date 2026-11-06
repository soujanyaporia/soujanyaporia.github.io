import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2QueueSizeFromPosition';

function readCount(story: string, pattern: RegExp): number {
  const match = pattern.exec(story);
  if (!match) throw new Error(`Missing queue clue ${pattern} in ${story}`);
  return Number(match[1]);
}

it('rebuilds the queue from the clues a pupil can read', () => {
  const ranks = new Set<number>();
  const arrivalCounts = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const story = [...(question.context ?? []), question.prompt].join(' ');
      const ahead = readCount(story, /(\d+) (?:people|pupils) are ahead of/);
      let behind: number;
      let newcomers = 0;
      if (story.includes('from the back')) {
        const rank = readCount(story, /(\d+)(?:st|nd|rd|th) from the back/);
        expect(rank).toBeGreaterThanOrEqual(1);
        expect(rank).toBeLessThanOrEqual(10);
        behind = rank - 1;
        ranks.add(rank);
        expect(question.unit).toBe('people');
      } else {
        behind = readCount(story, /(\d+) pupils are behind/);
        newcomers = readCount(story, /Then (\d+) more pupils join/);
        arrivalCounts.add(newcomers);
        expect(question.unit).toBe('pupils');
      }
      const originalQueue = ahead + 1 + behind;
      const expected = originalQueue + newcomers;
      expect(question.answer).toBe(String(expected));
      expect(correctAnswer(question, String(expected))).toBe(true);
      expect(correctAnswer(question, String(expected - 1))).toBe(false);
      expect(correctAnswer(question, String(expected + 1))).toBe(false);
      if (newcomers > 0) expect(correctAnswer(question, String(originalQueue))).toBe(false);
    }
  }
  expect(ranks.has(1)).toBe(true);
  expect(ranks.has(10)).toBe(true);
  expect(arrivalCounts.size).toBeGreaterThan(1);
});

it('replays a seed and uses consecutive indices to practise both forms', () => {
  for (const seed of [0, 1, 26, 73]) {
    const first = makeRagQuestion(seed);
    const next = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    expect(makeRagQuestion(seed, 1)).toEqual(next);
    expect(new Set([first.unit, next.unit])).toEqual(new Set(['people', 'pupils']));
  }
});
