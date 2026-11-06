import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragSharingACombinedTotal';

function counts(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing pupil-visible given in ${text}`);
  return match.slice(1).map(Number);
}

it('solves each form from the story and checks each worked equation', () => {
  const bagStories = new Set<string>();
  const teamStories = new Set<string>();

  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      const equations = q.workedSteps?.map(step => step.equation);
      let first: number;
      let second: number;
      let groups: number;
      const expectedSteps: string[] = [];
      const linked = q.prompt.startsWith('(a)');

      if (linked) {
        const [round, times] = counts(story, /(\d+) round stickers\. She has (\d+) times as many star stickers as round stickers/);
        [second, groups] = counts(q.prompt, /Iman brings (\d+) star stickers\..*?share all their star stickers equally among (\d+) teams/);
        expect(q.prompt).toContain('(a) How many star stickers does Leela have?');
        expect(q.prompt).toContain('How many star stickers does each team get?');
        expect(times).toBeGreaterThan(1);
        expect(times).toBeLessThan(10);
        first = round * times;
        expectedSteps.push(`${round} × ${times} = ${first}`);
        teamStories.add(`${round},${times},${second},${groups}`);
      } else {
        [first, second] = counts(story, /(\d+) beads in one tin and (\d+) beads in another tin/);
        [groups] = counts(story, /all the beads into (\d+) bags, with the same number in every bag/);
        expect(q.prompt).toBe('How many beads go in each bag?');
        bagStories.add(`${first},${second},${groups}`);
      }

      const total = first + second;
      expect(Math.min(first, second)).toBeGreaterThan(0);
      expect(groups).toBeGreaterThan(1);
      expect(groups).toBeLessThan(10);
      expect(total).toBeLessThan(1000);
      expect(total % groups).toBe(0);
      const share = total / groups;
      expectedSteps.push(`${first} + ${second} = ${total}`, `${total} ÷ ${groups} = ${share}`);
      expect(equations).toEqual(expectedSteps);

      if (linked) {
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Both linked entries are required');
        expect(spec.firstLabel).toContain('Leela');
        expect(spec.secondLabel).toContain('per team');
        expect(q.unit).toBe('star stickers');
        const response = JSON.stringify([String(first), String(share)]);
        expect(structuredResponseCorrect(spec, q.answer, response)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(first), String(total)]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(share)]))).toBe(false);
      } else {
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(share));
        expect(q.unit).toBe('beads');
      }
    }
  }
  expect(bagStories.size).toBeGreaterThan(10);
  expect(teamStories.size).toBeGreaterThan(10);
});

it('repeats a seed and index exactly and varies the visible givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(53, index);
    expect(makeRagQuestion(53, index)).toEqual(q);
    stories.add(JSON.stringify([q.context, q.prompt]));
  }
  expect(makeRagQuestion(53)).toEqual(makeRagQuestion(53, 0));
  expect(stories.size).toBeGreaterThan(1);
});
