import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragFractionFromPartCounts';

function readCount(story: string, clue: RegExp): number {
  const match = clue.exec(story);
  if (!match) throw new Error(`Missing visible clue ${clue} in ${story}`);
  return Number(match[1]);
}

test('solves each requested share using only the story and the question', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    const targets = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      stories.add(story);
      const whole = readCount(story, /ribbon into (\d+) equal pieces/);
      expect(whole).toBeGreaterThan(2);
      expect(whole).toBeLessThanOrEqual(12);
      const equations = q.workedSteps?.map(step => step.equation);

      if (q.prompt.includes('give away')) {
        targets.add('given and kept');
        expect(q.prompt).toContain('does she keep');
        const given = readCount(story, /Mei gives (\d+) pieces? to Ali and keeps the rest/);
        const kept = whole - given;
        expect(Math.min(given, kept)).toBeGreaterThan(0);
        expect(q.structuredResponse).toEqual({ kind: 'number-fields', fields: [
          { label: 'Given away (top number)' }, { label: 'Given away (bottom number)' },
          { label: 'Kept (top number)' }, { label: 'Kept (bottom number)' },
        ] });
        const expected = JSON.stringify([given, whole, kept, whole].map(String));
        expect(q.answer).toBe(expected);
        expect(correctAnswer(q, expected)).toBe(true);
        expect(correctAnswer(q, JSON.stringify([kept, whole, given, whole].map(String)))).toBe(false);
        expect(equations).toContain(`${whole} − ${given} = ${kept}`);
        continue;
      }

      const card = readCount(story, /Mei uses (\d+) pieces? for a card/);
      const relative = story.includes('more than');
      let box: number;
      if (relative) {
        const extra = readCount(story, /she uses (\d+) pieces? more than she used for the card/);
        box = card + extra;
        expect(box).toBeGreaterThan(card);
        expect(equations).toContain(`${card} + ${extra} = ${box}`);
      } else {
        box = readCount(story, /She uses (\d+) pieces? for a box/);
      }
      expect(Math.min(card, box)).toBeGreaterThan(0);
      const unused = whole - card - box;
      expect(unused).toBeGreaterThan(0);
      const asksForBoth = q.prompt.includes('altogether');
      if (!asksForBoth) expect(q.prompt).toContain('is left');
      if (relative) expect(asksForBoth).toBe(false);
      targets.add(asksForBoth ? 'combined' : relative ? 'left after larger removal' : 'left after two counts');
      const numerator = asksForBoth ? card + box : unused;
      const expected = `${numerator}/${whole}`;
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, `${numerator + 1}/${whole}`)).toBe(false);
      expect(equations).toContain(`${card} + ${box} = ${card + box}`);
      if (!asksForBoth) expect(equations).toContain(`${whole} − ${card + box} = ${unused}`);
      expect(equations).toContain(`${numerator} out of ${whole} = ${expected}`);
    }
    expect(targets.size).toBe(4);
  }
  expect(stories.size).toBeGreaterThan(20);
});

test('replays a question from its seed and index', () => {
  for (const seed of [-5, 0, 17, 2026]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 7)).toEqual(makeRagQuestion(seed, 7));
    expect(makeRagQuestion(seed, 7).key).not.toBe(makeRagQuestion(seed, 0).key);
  }
});
