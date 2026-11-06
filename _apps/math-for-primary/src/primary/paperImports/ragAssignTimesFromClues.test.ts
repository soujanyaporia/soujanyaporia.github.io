import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragAssignTimesFromClues';

function readClockRow(picture: Question['picture']) {
  if (picture?.type !== 'batch11-upper') throw Error('Missing clock diagram');
  const rims = picture.marks.flatMap(m => m.kind === 'circle' && m.r > 10 ? [m] : []);
  rims.sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  expect(rims).toHaveLength(4);
  return rims.map(({ cx, cy, r }, i) => {
    const labels = picture.marks.flatMap(m => m.kind === 'text' && /^[A-D]$/.test(m.text)
      && Math.abs(m.y - cy) < r && m.x < cx - r && cx - m.x < 3 * r ? [m.text] : []);
    expect(labels).toEqual(['ABCD'[i]]);
    const hands = picture.marks.flatMap(m => m.kind === 'line' && m.x1 === cx && m.y1 === cy
      ? [{ dx: m.x2 - cx, dy: m.y2 - cy }] : []);
    const length = (hand: typeof hands[number]) => Math.hypot(hand.dx, hand.dy);
    hands.sort((a, b) => length(a) - length(b));
    expect(hands).toHaveLength(2);
    expect(length(hands[0])).toBeGreaterThan(0);
    expect(length(hands[0])).toBeLessThan(length(hands[1]));
    const turn = (hand: typeof hands[number]) => (Math.atan2(hand.dx, -hand.dy) / (2 * Math.PI) + 1) % 1;
    const minutes = Math.round(720 * turn(hands[0])) % 720;
    const longHand = Math.round(60 * turn(hands[1])) % 60;
    expect([0, 30]).toContain(longHand);
    expect(minutes % 60).toBe(longHand);
    expect(minutes).toBeGreaterThanOrEqual(480);
    expect(minutes).toBeLessThanOrEqual(690);
    return minutes;
  });
}

function permutations(names: string[]): string[][] {
  if (!names.length) return [[]];
  return names.flatMap(name => permutations(names.filter(other => other !== name)).map(rest => [name, ...rest]));
}

function solve(givens: Pick<Question, 'order' | 'picture' | 'context'>) {
  const { order, picture, context } = givens;
  if (!order || !context) throw Error('Missing name tiles or clues');
  expect(order).toHaveLength(4);
  expect(new Set(order).size).toBe(4);
  expect(context[0]).toMatch(/one morning/);
  const times = readClockRow(picture);
  expect(new Set(times).size).toBe(4);
  expect(times).not.toEqual([...times].sort((a, b) => a - b));
  expect(times.some(t => t % 60 === 0 && times.includes(t + 30))).toBe(true);

  const clues = context.slice(1);
  expect(clues).toHaveLength(3);
  const constraints = clues.map(clue => {
    const pair = /^(\w+) arrived (before|after) (\w+)\.$/.exec(clue);
    if (pair) {
      const [, a, relation, b] = pair;
      expect(order).toContain(a);
      expect(order).toContain(b);
      return (row: string[]) => relation === 'before'
        ? times[row.indexOf(a)] < times[row.indexOf(b)]
        : times[row.indexOf(a)] > times[row.indexOf(b)];
    }
    const end = /^(\w+) arrived last\.$/.exec(clue);
    if (!end) throw Error('Unrecognised arrival clue');
    expect(order).toContain(end[1]);
    return (row: string[]) => times[row.indexOf(end[1])] === Math.max(...times);
  });
  const solutions = permutations(order).filter(row => constraints.every(test => test(row)));
  expect(solutions).toHaveLength(1);
  return solutions[0];
}

it('matches all four pictured clocks using only the name tiles and arrival clues', () => {
  const puzzles = new Set<string>();
  for (let seed = -3; seed < 30; seed++) {
    for (const index of [0, 1, 2, 7]) {
      const q = makeRagQuestion(seed, index);
      const row = solve(q);
      expect(q.prompt).toContain('clock A');
      expect(q.prompt).toContain('clocks B, C and D');
      expect(q.answer).toBe(row.join(','));
      expect(correctAnswer(q, row.join(','))).toBe(true);
      expect(correctAnswer(q, row.slice(0, 3).join(','))).toBe(false);
      for (let i = 1; i < 4; i++) {
        const swapped = [...row];
        [swapped[0], swapped[i]] = [swapped[i], swapped[0]];
        expect(correctAnswer(q, swapped.join(','))).toBe(false);
      }
      puzzles.add(JSON.stringify([q.context, q.picture]));
    }
  }
  expect(puzzles.size).toBeGreaterThan(50);
});

it('replays the same puzzle for a seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(17, 5)).toEqual(makeRagQuestion(17, 5));
});
