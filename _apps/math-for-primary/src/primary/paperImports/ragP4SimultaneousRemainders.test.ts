import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4SimultaneousRemainders';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing pupil clue for ${pattern} in ${text}`);
  return Number(match[1]);
}

it('solves each form from the printed row clues, limits and question', () => {
  const seen = new Set<string>();
  const visibleQuestions = new Set<string>();
  for (let seed = -12; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      visibleQuestions.add(text);
      const first = readNumber(text, /rows of (\d+)/);
      const second = readNumber(text, /tries rows of (\d+) instead/);
      const extra = readNumber(text, /she has (\d+) tiles? left over/);
      const exact = text.includes('every row full');
      const shortfall = exact ? 0 : readNumber(text, /needs (\d+) more tiles?/);
      const least = q.prompt.includes('smallest number');
      const low = /more than (\d+) tiles/.exec(text);
      const high = /fewer than (\d+) tiles/.exec(text);
      expect(extra).toBeGreaterThan(0);
      expect(extra).toBeLessThan(second);
      expect(shortfall).toBeLessThan(first);
      if (!exact) expect(shortfall).toBeGreaterThan(0);
      expect(Boolean(high)).toBe(!least);
      expect(Boolean(low)).toBe(!least && !exact);
      seen.add(least ? 'least' : exact ? 'exact' : 'between');

      // Try every positive count in range. For a least-count question one
      // product covers a full cycle of both row sizes, including its endpoint.
      const start = low ? Number(low[1]) + 1 : 1;
      const end = high ? Number(high[1]) - 1 : first * second;
      const solutions: number[] = [];
      let fitFirst = 0;
      let fitSecond = 0;
      for (let count = start; count <= end; count++) {
        const fillsFirst = (count + shortfall) % first === 0;
        const leavesExtra = count - Math.floor(count / second) * second === extra;
        if (fillsFirst) fitFirst++;
        if (leavesExtra) fitSecond++;
        if (fillsFirst && leavesExtra) solutions.push(count);
      }
      expect(fitFirst).toBeGreaterThan(1);
      expect(fitSecond).toBeGreaterThan(1);
      expect(solutions.length).toBeGreaterThan(0);
      const total = solutions[0];
      if (least) {
        expect(q.prompt).toContain(`(b) With ${second} tiles to a row`);
        let addition = 1;
        while ((total + addition) % second !== 0) addition++;
        const expected = JSON.stringify([String(total), String(addition)]);
        expect(q.answer).toBe(expected);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Expected separate entries for (a) and (b)');
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(total)]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(addition), String(total)]))).toBe(false);
      } else {
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(String(total));
        expect(q.unit).toBe('tiles');
        expect(q.structuredResponse).toBeUndefined();
      }
    }
  }
  expect(seen).toEqual(new Set(['exact', 'between', 'least']));
  expect(visibleQuestions.size).toBeGreaterThan(16);
});

it('reproduces the same question for a seed and index', () => {
  expect(makeRagQuestion(18)).toEqual(makeRagQuestion(18, 0));
  expect(makeRagQuestion(-9, 5)).toEqual(makeRagQuestion(-9, 5));
});
