import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRepeatedEqualShares';

// Find the smallest possible denominator by trying equivalent fractions in order.
function simplestFields(parts: number, whole: number): string[] {
  for (let bottom = 1; bottom <= whole; bottom++) {
    const top = parts * bottom / whole;
    if (Number.isInteger(top)) return [String(top), String(bottom)];
  }
  throw new Error('The visible whole must contain a whole number of equal parts.');
}

test('solves both entries from the ribbon story and grades each part separately', () => {
  const counts = new Set<number>();
  const denominators = new Set<number>();
  let sawReduction = false;
  for (let seed = -12; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (!q.prompt.includes('(a)')) continue;
      const story = q.context?.join(' ') ?? '';
      expect(story).toContain('one full roll');
      const match = /(\d+) children each cut off (\d+)\/(\d+) of the original roll/.exec(story);
      if (!match) throw new Error('Missing group size or share of the original roll.');
      const [count, top, bottom] = match.slice(1).map(Number);
      expect(count).toBeGreaterThanOrEqual(2);
      expect(top).toBe(1);
      expect(bottom).toBeLessThanOrEqual(12);
      expect(count * top).toBeLessThan(bottom);
      counts.add(count);
      denominators.add(bottom);

      let piecesLeft = bottom;
      for (let child = 0; child < count; child++) piecesLeft -= top;
      const used = simplestFields(bottom - piecesLeft, bottom);
      const left = simplestFields(piecesLeft, bottom);
      const expected = JSON.stringify([...used, ...left]);
      expect(q.prompt).toMatch(/\(b\).*left/);
      expect(q.prompt).toContain('simplest form');
      expect(q.structuredResponse).toMatchObject({ kind: 'number-fields', fields: [
        { label: '(a) Cut off — top number' }, { label: '(a) Cut off — bottom number' },
        { label: '(b) Left — top number' }, { label: '(b) Left — bottom number' },
      ] });
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, JSON.stringify(used))).toBe(false);
      expect(correctAnswer(q, JSON.stringify([...used, '0', left[1]]))).toBe(false);
      if (used[0] !== left[0]) {
        expect(correctAnswer(q, JSON.stringify([...left, ...used]))).toBe(false);
      }
      if (Number(used[1]) < bottom) {
        sawReduction = true;
        const unreduced = [String(bottom - piecesLeft), String(bottom), ...left];
        expect(correctAnswer(q, JSON.stringify(unreduced))).toBe(false);
      }
    }
  }
  expect(counts.size).toBeGreaterThan(1);
  expect(denominators.size).toBeGreaterThan(3);
  expect(sawReduction).toBe(true);
});

test('finds the number of unit pieces in a whole from the printed share', () => {
  const sizes = new Set<number>();
  for (let seed = -12; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.prompt.includes('(a)')) continue;
      expect(q.prompt).toMatch(/how many pieces.*whole strip/i);
      const match = /Each piece is (\d+)\/(\d+) of the strip/.exec(q.context?.join(' ') ?? '');
      if (!match) throw new Error('The size of one piece must be visible.');
      const [top, bottom] = match.slice(1).map(Number);
      expect(top).toBe(1);
      expect(bottom).toBeGreaterThan(1);
      expect(bottom).toBeLessThanOrEqual(12);
      const pieces = bottom / top;
      sizes.add(pieces);
      expect(q.unit).toBe('pieces');
      expect(q.answer).toBe(String(pieces));
      expect(correctAnswer(q, String(pieces))).toBe(true);
      expect(correctAnswer(q, `${top}/${bottom}`)).toBe(false);
    }
  }
  expect(sizes.size).toBeGreaterThan(3);
});

test('replays a seed and index and offers both tasks at consecutive indices', () => {
  for (const seed of [-7, 0, 31]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const next = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 1)).toEqual(next);
    expect(Boolean(next.structuredResponse)).toBe(!first.structuredResponse);
  }
});
