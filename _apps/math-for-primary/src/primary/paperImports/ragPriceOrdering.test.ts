import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPriceOrdering';

function readTags(q: Question) {
  expect(q.context).toHaveLength(3);
  return (q.context ?? []).map(line => {
    const match = /^(?:(.+?) — )?(\$(\d+)\.(\d{2}))$/.exec(line);
    if (!match) throw new Error(`Unreadable price tag: ${line}`);
    return { name: match[1], price: match[2], dollars: Number(match[3]), cents: Number(match[4]) };
  });
}

it('solves each requested response from the printed tags and the direction in the prompt', () => {
  const forms = new Set<string>();
  const winners = new Set<string>();
  for (let seed = -3; seed < 32; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const tags = readTags(q);
      expect(new Set(tags.map(t => t.price)).size).toBe(3);
      expect(new Set(tags.map(t => t.dollars)).size).toBe(2);
      for (const t of tags) {
        expect(t.dollars).toBeGreaterThan(0);
        expect(t.dollars).toBeLessThan(100);
        expect(t.cents % 5).toBe(0);
      }
      // Compare the printed parts separately, as a pupil would.
      const ranked = [...tags].sort((a, b) => a.dollars - b.dollars || a.cents - b.cents);
      let expected: string;
      if (q.prompt.includes('largest to smallest')) {
        forms.add('descending amounts');
        expect(tags.every(t => !t.name)).toBe(true);
        expect(q.order?.slice().sort()).toEqual(tags.map(t => t.price).sort());
        expected = ranked.reverse().map(t => t.price).join(',');
      } else {
        expect(new Set(tags.map(t => t.name))).toEqual(new Set(['Red bag', 'Blue bag', 'Green bag']));
        if (q.prompt.includes('cheapest first')) {
          forms.add('ascending labels');
          expect(q.order?.slice().sort()).toEqual(tags.map(t => t.name).sort());
          expected = ranked.map(t => t.name).join(',');
        } else {
          expect(q.choices?.slice().sort()).toEqual(tags.map(t => t.name).sort());
          if (q.prompt.includes('highest price')) {
            forms.add('highest');
            expected = ranked[2].name;
            winners.add(expected);
            const next = makeRagQuestion(seed, index + 1);
            expect(next.prompt).toContain('cheapest first');
            expect(next.context).toEqual(q.context);
          } else {
            forms.add('above reference');
            const referenceName = /^Which bag costs more than the (.+)\?$/.exec(q.prompt)?.[1];
            const ref = tags.find(t => t.name.toLowerCase() === referenceName);
            if (!ref) throw new Error(`Missing reference bag in ${q.prompt}`);
            const dearer = tags.filter(t => t.dollars > ref.dollars || (t.dollars === ref.dollars && t.cents > ref.cents));
            expect(dearer).toHaveLength(1);
            expected = dearer[0].name;
          }
        }
      }
      expect(q.answer).toBe(expected);
      if (q.order) expect(q.order.join(',')).not.toBe(expected);
    }
  }
  expect(forms.size).toBe(4);
  expect(winners.size).toBe(3);
});

it('replays the same question and varies the visible prices across seeds', () => {
  const priceSets = new Set<string>();
  for (let seed = 0; seed < 16; seed++) {
    const q = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(q);
    priceSets.add(readTags(q).map(t => t.price).sort().join(','));
  }
  expect(priceSets.size).toBeGreaterThan(1);
});
