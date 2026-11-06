import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragEquallySpacedPoints';

it('counts flag positions from the visible start through the visible end', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      expect(story).toContain('one row along one side');
      expect(story).toContain('a flag at each end');
      expect(q.prompt).toMatch(/how many flags/i);
      expect(q.unit).toBe('flags');
      const spanMatch = /path is (\d+) m long/.exec(story);
      const gapMatch = /between neighbouring flags is (\d+) m\./.exec(story);
      if (!spanMatch || !gapMatch) throw new Error('Missing path length or spacing in metres');
      const span = Number(spanMatch[1]);
      const step = Number(gapMatch[1]);
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(9);
      expect(span).toBeGreaterThan(step);
      expect(span).toBeLessThanOrEqual(999);

      // Walk the row in metres. Include position zero before taking any steps.
      const positions: number[] = [];
      for (let metre = 0; metre <= span; metre += step) positions.push(metre);
      expect(positions[positions.length - 1]).toBe(span);
      expect(q.answer).toBe(String(positions.length));
      seen.add(`${span}:${step}`);
    }
  }
  expect(seen.size).toBeGreaterThan(8);
});

it('reproduces a question for the same seed and index', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  expect(makeRagQuestion(31, 4)).toEqual(makeRagQuestion(31, 4));
});
