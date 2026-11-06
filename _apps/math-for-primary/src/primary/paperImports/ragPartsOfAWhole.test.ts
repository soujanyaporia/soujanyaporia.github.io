import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPartsOfAWhole';

// Read only what the pupil sees. The answer, proof and worked steps are not solver inputs.
function readGivens(q: Question) {
  if (q.display !== undefined) {
    const m = /^(\d+) \+ (\d+) \+ □ = (\d+)$/.exec(q.display);
    if (!m) throw new Error(`Incomplete addition sentence: ${q.display}`);
    return { form: 'square', a: Number(m[1]), b: Number(m[2]), whole: Number(m[3]) };
  }
  const story = (q.context ?? []).join(' ');
  const beads = /A box holds (\d+) beads\. Each bead is just one colour: red, green or blue\. There are (\d+) red beads and (\d+) green beads\./.exec(story);
  if (beads && q.prompt.includes('blue beads')) {
    return { form: 'beads', whole: Number(beads[1]), a: Number(beads[2]), b: Number(beads[3]) };
  }
  const cards = /numbers on three cards add up to (\d+)\. Two cards show (\d+) and (\d+)\./.exec(story);
  if (cards && q.prompt.includes('last card')) {
    return { form: 'cards', whole: Number(cards[1]), a: Number(cards[2]), b: Number(cards[3]) };
  }
  throw new Error(`Cannot identify the whole, the two known parts and the requested part: ${story} ${q.prompt}`);
}

it('recovers the missing part from the visible givens in every form', () => {
  const examples = new Map<string, Set<string>>();
  for (let seed = -12; seed <= 36; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, whole, a, b } = readGivens(q);
      const left = (whole - a) - b;
      for (const part of [a, b, left]) {
        expect(Number.isInteger(part)).toBe(true);
        expect(part).toBeGreaterThanOrEqual(100);
        expect(part).toBeLessThan(1000);
      }
      expect(whole).toBeLessThanOrEqual(1000);
      if (form === 'square') expect(whole).toBe(1000);
      expect(q.answer).toBe(String(left));
      expect(q.unit).toBe(form === 'beads' ? 'beads' : undefined);
      expect(q.choices).toBeUndefined();
      expect(q.workedSteps?.map(step => step.equation)).toEqual([`${a} + ${b} = ${a + b}`, `${whole} − ${a + b} = ${left}`]);
      const seen = examples.get(form) ?? new Set<string>();
      seen.add(`${whole}:${a}:${b}`);
      examples.set(form, seen);
    }
  }
  expect([...examples.keys()].sort()).toEqual(['beads', 'cards', 'square']);
  for (const seen of examples.values()) expect(seen.size).toBeGreaterThan(10);
});

it('replays the same question and uses the index to vary the presentation', () => {
  const first = makeRagQuestion(17);
  expect(makeRagQuestion(17, 0)).toEqual(first);
  const forms = [0, 1, 2].map(i => readGivens(makeRagQuestion(17, i)).form);
  expect(new Set(forms).size).toBe(3);
});
