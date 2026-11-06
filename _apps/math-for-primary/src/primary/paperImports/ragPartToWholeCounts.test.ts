import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPartToWholeCounts';

// Interpret only what a pupil sees. The question's key, answer and solution are not givens.
function readCounts(q: Question) {
  const story = (q.context ?? []).join(' ');
  if (story.includes('buttons')) {
    const groups = [...story.matchAll(/(\d+) (\w+) buttons\b/g)].map(m => ({ n: Number(m[1]), colour: m[2] }));
    const wanted = [...q.prompt.matchAll(/\b(blue|pink|green|yellow)\b/g)].map(m => m[1]);
    expect([1, 2]).toContain(wanted.length);
    expect(groups).toHaveLength(wanted.length + 1);
    expect(new Set(groups.map(g => g.colour)).size).toBe(groups.length);
    expect(groups.filter(g => wanted.includes(g.colour))).toHaveLength(wanted.length);
    return { form: wanted.length === 1 ? 'single' : 'combined', part: groups.filter(g => wanted.includes(g.colour)).reduce((n, g) => n + g.n, 0), total: groups.reduce((n, g) => n + g.n, 0) };
  }
  const melon = /(\d+) equal slices\. He gives (\d+) slices/.exec(story);
  if (melon) {
    expect(q.prompt).toMatch(/give his neighbours/);
    return { form: 'given', part: Number(melon[2]), total: Number(melon[1]) };
  }
  const bread = /equal pieces\. She packs (\d+) pieces for lunch and saves the last (\d+) pieces for dinner/.exec(story);
  if (!bread) throw new Error(`Cannot identify all the pieces in: ${story}`);
  expect(q.prompt).toMatch(/save for dinner/);
  return { form: 'saved', part: Number(bread[2]), total: Number(bread[1]) + Number(bread[2]) };
}

// The first denominator that represents this share exactly is its simplest denominator.
function simplest(part: number, total: number): string {
  for (let d = 1; d <= total; d++) if ((part * d) % total === 0) return `${part * d / total}/${d}`;
  throw new Error('No exact fraction');
}

it('solves every response from the visible counts and the requested part', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = 0; seed < 64; seed++) for (let index = 0; index < 4; index++) {
    const q = makeRagQuestion(seed, index);
    const { form, part, total } = readCounts(q);
    expect(part).toBeGreaterThan(0);
    expect(part).toBeLessThan(total);
    const raw = `${part}/${total}`;
    const samples = seen.get(form) ?? new Set<string>();
    samples.add(raw); seen.set(form, samples);
    if (form === 'saved') {
      expect(q.choices).toHaveLength(4);
      const values = q.choices!.map(option => {
        expect(option).toMatch(/^[1-9]\d*\/[1-9]\d*$/);
        const [n, d] = option.split('/').map(Number);
        return { option, n, d };
      });
      expect(new Set(values.map(v => simplest(v.n, v.d))).size).toBe(4);
      const matches = values.filter(v => v.n * total === part * v.d);
      expect(matches.map(v => v.option)).toEqual([raw]);
      expect(q.answer).toBe(raw);
      for (const v of values) expect(correctAnswer(q, v.option)).toBe(v.n * total === part * v.d);
    } else {
      expect(q.prompt).toContain('simplest form');
      expect(q.choices).toBeUndefined();
      const expected = simplest(part, total);
      expect(expected).not.toBe(raw);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, raw)).toBe(false);
      expect(correctAnswer(q, simplest(total - part, total))).toBe(false);
    }
  }
  expect([...seen.keys()].sort()).toEqual(['combined', 'given', 'saved', 'single']);
  for (const samples of seen.values()) expect(samples.size).toBeGreaterThan(1);
});

it('reproduces a question by seed and index, including the order of choices', () => {
  const makeSet = () => Array.from({ length: 16 }, (_, i) => makeRagQuestion(57, i));
  const set = makeSet();
  expect(makeSet()).toEqual(set);
  expect(new Set(set.map(q => JSON.stringify([q.context, q.prompt]))).size).toBeGreaterThan(1);
});
