import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4FractionalLossThenFixedChange';

function solveVisibleQuestion(q: Question) {
  const story = q.context?.join(' ') ?? '';
  const match = /^The school shop had (some|\d+) bookmarks when it opened\. Before lunch, it sold (\d+)\/(\d+) of those bookmarks\. After lunch, it (sold|received) (\d+) more bookmarks\.(?: At closing time, the shop had (\d+) bookmarks\.)?$/.exec(story);
  if (!match) throw new Error(`Could not read the stock changes in ${story}`);
  const [, opening, numerator, denominator, action, fixedCount, closing] = match;
  const n = Number(numerator), d = Number(denominator), fixed = Number(fixedCount);
  expect(n).toBeGreaterThan(0);
  expect(d).toBeGreaterThan(n);
  expect(d).toBeLessThanOrEqual(9);
  expect(fixed).toBeGreaterThan(0);

  // Replay both transactions using the number sold in the morning.
  const atClose = (start: number) => start - (start / d) * n + (action === 'received' ? fixed : -fixed);
  if (opening !== 'some') {
    expect(q.prompt).toContain('at closing time');
    expect(closing).toBeUndefined();
    expect(action).toBe('sold');
    expect(Number(opening) % d).toBe(0);
    return { variant: 'forward loss', count: atClose(Number(opening)) };
  }

  expect(q.prompt).toContain('when it opened');
  expect(closing).toBeDefined();
  const end = Number(closing);
  expect(end).toBeGreaterThan(0);
  // At least one of d equal parts survived the morning sale. One part can
  // therefore contain at most end + fixed bookmarks for either afternoon action.
  const candidates: number[] = [];
  for (let part = 1; part <= end + fixed; part++) {
    const start = part * d;
    if (atClose(start) === end) candidates.push(start);
  }
  expect(candidates).toHaveLength(1);
  return { variant: action === 'received' ? 'inverse gain' : 'inverse loss', count: candidates[0] };
}

it('solves all three forms from the pupil’s givens', () => {
  const variants = new Set<string>();
  const stories = new Set<string>();
  for (let seed = -8; seed <= 15; seed++) {
    for (let index = 0; index < 10; index++) {
      const q = makeRagQuestion(seed, index);
      const solution = solveVisibleQuestion(q);
      expect(Number.isSafeInteger(solution.count)).toBe(true);
      expect(solution.count).toBeGreaterThan(0);
      expect(q.answer).toBe(String(solution.count));
      expect(q.unit).toBe('bookmarks');
      variants.add(solution.variant);
      stories.add(q.context!.join(' '));
    }
  }
  expect(variants).toEqual(new Set(['forward loss', 'inverse gain', 'inverse loss']));
  expect(stories.size).toBeGreaterThan(100);
});

it('replays a seed and index, including the default first question', () => {
  expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  expect(makeRagQuestion(-17, 6)).toEqual(makeRagQuestion(-17, 6));
});
