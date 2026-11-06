import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2CountUnitFractionsInWholes';

function solveStripStory(lines: string[]) {
  const story = lines.join(' ');
  const stripCount = /\b(\d+) paper strips\b/.exec(story);
  const cut = /\bcut into (\w+)\./.exec(story);
  const piecesInOne: Record<string, number> = { halves: 2, thirds: 3, quarters: 4, fifths: 5, tenths: 10 };
  if (!stripCount || !cut || !piecesInOne[cut[1]]) throw new Error(`Missing strip count or fraction name in ${story}`);
  const strips = Number(stripCount[1]);
  const one = piecesInOne[cut[1]];
  let all = 0;
  for (let strip = 0; strip < strips; strip++) all += one;
  return { strips, name: cut[1], one, all };
}

test('grades each requested count from the visible strip story', () => {
  const forms = new Set<string>();
  const names = new Set<string>();
  const counts = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { strips, name, one, all } = solveStripStory(q.context ?? []);
      names.add(name);
      counts.add(strips);
      expect([2, 4, 5, 7, 8]).toContain(strips);
      expect(q.prompt).toContain('all the strips together');
      if (q.prompt.includes('from one strip')) {
        forms.add('linked');
        expect(q.structuredResponse).toEqual({
          kind: 'number-pair',
          firstLabel: `From 1 strip (${name})`,
          secondLabel: `From all ${strips} strips (${name})`,
        });
        const pair = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
        expect(q.answer).toBe(pair(one, all));
        expect(correctAnswer(q, pair(one, all))).toBe(true);
        expect(correctAnswer(q, pair(all, one))).toBe(false);
        expect(correctAnswer(q, pair(one + 1, all))).toBe(false);
        expect(correctAnswer(q, pair(one, one))).toBe(false);
      } else {
        forms.add('single');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe(name);
        expect(q.answer).toBe(String(all));
        expect(correctAnswer(q, String(all))).toBe(true);
        expect(correctAnswer(q, String(one))).toBe(false);
      }
    }
  }
  expect(forms.size).toBe(2);
  expect(names).toEqual(new Set(['halves', 'thirds', 'fifths', 'tenths']));
  expect(counts.size).toBe(5);
});

test('replays the same question for the same seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(17, 5)).toEqual(makeRagQuestion(17, 5));
});
