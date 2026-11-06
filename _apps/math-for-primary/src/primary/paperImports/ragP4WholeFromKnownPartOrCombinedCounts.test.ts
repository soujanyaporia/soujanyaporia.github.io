import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4WholeFromKnownPartOrCombinedCounts';

function readCount(text: string, wording: RegExp): number {
  const match = wording.exec(text);
  if (!match) throw new Error(`Missing visible count for ${wording}`);
  return Number(match[1]);
}

it('finds the unique starting count from the pupil-facing clues in each form', () => {
  const seen = new Set<string>();
  for (let seed = -4; seed < 48; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      let expected: number;
      if (story.includes('games club')) {
        expect(story).toContain('Half went outside and the rest stayed in the hall.');
        expect(story).toContain('All the others played a card game.');
        const chess = readCount(story, /(\d+) played chess/);
        const sorting = readCount(story, /(\d+) of its players sorted the cards/);
        const stacking = readCount(story, /the other (\d+) stacked chairs/);
        const stayed = chess + sorting + stacking;
        expected = stayed + stayed;
        expect(q.unit).toBe('pupils');
        expect(q.prompt).toContain('at the start');
        expect(q.prompt).toContain('Show your working');
        expect(q.choices).toBeUndefined();
        seen.add('nested');
      } else {
        const fraction = /used (\d+)\/(\d+) of the beads/.exec(story);
        if (!fraction) throw new Error('The fraction of beads used is missing');
        const numerator = Number(fraction[1]);
        const denominator = Number(fraction[2]);
        expect(numerator).toBeGreaterThan(0);
        expect(numerator).toBeLessThan(denominator);
        expect(denominator).toBeLessThanOrEqual(12);
        const left = story.includes('beads left');
        const count = readCount(story, left ? /There were (\d+) beads left/ : /She used (\d+) beads for the bracelets/);
        // Try full boxes forwards. Even if the given count is just one part,
        // the box cannot hold more than count × denominator beads.
        const solutions: number[] = [];
        for (let box = denominator; box <= count * denominator; box += denominator) {
          const used = (box / denominator) * numerator;
          if ((left ? box - used : used) === count) solutions.push(box);
        }
        expect(solutions).toHaveLength(1);
        expected = solutions[0];
        expect(q.unit).toBe('beads');
        expect(q.prompt).toContain('before Lian made the bracelets');
        if (left) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(String(expected));
        } else {
          expect(q.choices).toBeUndefined();
        }
        seen.add(left ? 'remainder' : 'direct');
      }
      expect(q.answer).toBe(String(expected));
      expect(q.workedSteps?.at(-1)?.equation).toMatch(new RegExp(`= ${expected}$`));
    }
  }
  expect(seen).toEqual(new Set(['direct', 'remainder', 'nested']));
});

it('reproduces a seed and index and varies the visible givens across a session', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(q);
    stories.add(JSON.stringify(q.context));
  }
  expect(stories.size).toBeGreaterThanOrEqual(8);
});
