import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GroupingBuilder } from '../GroupingBuilder';
import { PaperMaterials } from '../PaperMaterials';
import { validGrouping } from '../groupingAnswer';
import { makeRagQuestion } from './ragFixedSizeGroups';

function readNumber(text: string, pattern: RegExp) {
  const m = text.match(pattern);
  if (!m || Number(m[1]) < 1) throw new Error('Missing visible given: ' + text);
  return Number(m[1]);
}

it('solves the board and the pictures from what a pupil can see', () => {
  const seen = new Set<string>();
  const sizes = new Set<number>();
  const totals = new Set<number>();
  for (let seed = 0; seed < 24; seed++) {
    for (let i = 0; i < 10; i++) {
      const q = makeRagQuestion(seed, i);
      const text = [...(q.context ?? []), q.prompt].join(' ');
      const k = readNumber(text, /(?:groups of |packs |Put )(\d+)/);
      sizes.add(k);
      let total: number;
      if (q.grouping) {
        const html = renderToStaticMarkup(createElement(GroupingBuilder, {
          spec: q.grouping, value: '', onChange: () => {},
        }));
        const ids = Array.from(html.matchAll(/aria-label="Select gift (\d+)"/g), m => Number(m[1]) - 1);
        total = ids.length;
        const rows: number[][] = [];
        // Pack from opposite ends so this need not be the stored example.
        const gifts = [...ids];
        while (gifts.length) {
          const row: number[] = [];
          while (row.length < k && gifts.length) row.push(row.length % 2 ? gifts.shift()! : gifts.pop()!);
          rows.push(row);
        }
        expect(rows.every(row => row.length === k)).toBe(true);
        expect(html).toContain('Make groups of ' + k + '.');
        expect(validGrouping(q.grouping, JSON.stringify(rows))).toBe(true);
        const sample: number[][] = JSON.parse(q.answer);
        expect(sample.map(row => row.length)).toEqual(rows.map(row => row.length));
        expect(sample.flat().sort((a, b) => a - b)).toEqual(ids);
        expect(validGrouping(q.grouping, JSON.stringify(rows.slice(1)))).toBe(false);
        const unequal = rows.map(row => row.slice());
        unequal[1].push(unequal[0].pop()!);
        expect(validGrouping(q.grouping, JSON.stringify(unequal))).toBe(false);
        seen.add(q.context?.length ? 'pack' : 'sort');
      } else {
        if (!q.picture) throw new Error('Missing star picture');
        const html = renderToStaticMarkup(createElement(PaperMaterials, { model: q.picture }));
        total = (html.match(/✦/g) ?? []).length;
        const loops = Array.from(html.matchAll(/<span class="play-counter-group">([\s\S]*?)<\/span>/g), m => m[1]);
        if (loops.length) {
          expect(loops.every(loop => (loop.match(/✦/g) ?? []).length === k)).toBe(true);
          expect(loops.length * k).toBe(total);
          expect(q.answer).toBe(String(loops.length));
          const bags = /bags/.test(q.prompt);
          expect(q.unit).toBe(bags ? 'bags' : 'groups');
          seen.add(bags ? 'bags' : 'loops');
        } else {
          expect(q.prompt).toMatch(/badges/);
          expect(q.unit).toBe('badges');
          let used = 0, badges = 0;
          while (used + k <= total) { used += k; badges++; }
          expect(used).toBe(total);
          expect(q.answer).toBe(String(badges));
          seen.add('badges');
        }
      }
      totals.add(total);
      expect(k).toBeGreaterThanOrEqual(2);
      expect(total).toBeGreaterThan(k);
      expect(total).toBeLessThanOrEqual(20);
      expect(total % k).toBe(0);
      if (/Nia has/.test(text)) expect(readNumber(text, /Nia has (\d+) gifts/)).toBe(total);
    }
  }
  expect([...seen].sort()).toEqual(['badges', 'bags', 'loops', 'pack', 'sort']);
  expect(sizes.size).toBeGreaterThan(2);
  expect(totals.size).toBeGreaterThan(4);
});

it('keeps the construction and the count consecutive with identical bag givens', () => {
  for (let seed = 0; seed < 30; seed++) {
    const set = Array.from({ length: 5 }, (_, i) => makeRagQuestion(seed, i));
    const a = set.findIndex(q => q.grouping && q.context?.some(s => s.includes('Nia')));
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(4);
    const b = set[a + 1];
    expect(b.unit).toBe('bags');
    expect(b.context?.[0]).toBe(set[a].context?.[0]);
    const story = b.context![0];
    expect(b.answer).toBe(String(readNumber(story, /has (\d+) gifts/) / readNumber(story, /packs (\d+) gifts/)));
    expect(makeRagQuestion(seed, a + 1)).toEqual(b);
  }
});
