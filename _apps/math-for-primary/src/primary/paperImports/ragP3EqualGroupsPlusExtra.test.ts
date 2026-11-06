import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP3EqualGroupsPlusExtra';

function readCount(story: string, pattern: RegExp): number {
  const match = pattern.exec(story);
  if (!match) throw new Error(`Missing count for ${pattern} in ${story}`);
  return Number(match[1]);
}

it('solves both stories using only the givens shown to the pupil', () => {
  const weekStories = new Set<string>();
  const offerStories = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      if (story.includes('each day')) {
        weekStories.add(story);
        expect(story).toMatch(/one full week/);
        expect(q.prompt).toMatch(/before Siti started/);
        const daily = readCount(story, /takes (\d+) beads/);
        let before = readCount(story, /(\d+) beads remain/);
        for (let day = 0; day < 7; day++) before += daily;
        expect(q.answer).toBe(String(before));
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(before));
        expect(q.unit).toBe('beads');
      } else {
        offerStories.add(story);
        expect(story).toMatch(/1 free badge for each group/);
        expect(q.prompt).toMatch(/both paid and free badges/);
        expect(q.prompt).toMatch(/least/);
        const groupSize = readCount(story, /group of (\d+) badges/);
        const received = readCount(story, /receives (\d+) free badges/);
        // Try paid counts in order. The first qualifying purchase attains the minimum.
        let leastTotal: number | undefined;
        for (let paid = 0; paid <= 999; paid++) {
          const earned = Math.floor(paid / groupSize);
          if (earned === received) {
            leastTotal = paid + earned;
            break;
          }
        }
        expect(leastTotal).toBeDefined();
        expect(q.answer).toBe(String(leastTotal));
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('badges');
      }
    }
  }
  expect(weekStories.size).toBeGreaterThan(10);
  expect(offerStories.size).toBeGreaterThan(10);
});

it('replays the same wording, choices and solution for the same seed and index', () => {
  for (const seed of [0, 11, 73]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 1; index < 5; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
