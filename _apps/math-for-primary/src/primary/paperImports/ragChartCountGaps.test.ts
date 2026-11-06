import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragChartCountGaps';

function read(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error('Could not read the given: ' + text);
  return match.slice(1);
}

it('solves each response from the labelled graph, question and any printed clue', () => {
  const forms = new Set<string>();
  const unplottedRanks = new Set<string>();
  const differenceClaims = new Set<string>();
  const claimOutcomes = Array.from({ length: 4 }, () => new Set<boolean>());
  for (let seed = -8; seed < 72; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const p = q.picture;
      if (p?.type === 'batch2-early' && p.layout === 'sales-bars') {
        forms.add('range');
        expect(q.prompt).toMatch(/most common design.*least common design/);
        const [name, count] = read(q.context!.join(' '), /row for (\w+) is still blank\. There are (\d+) bookmarks/);
        const pos = p.days.indexOf(name);
        expect(pos).toBeGreaterThanOrEqual(0);
        expect(p.values[pos]).toBe(0);
        const shown = p.values.filter((_, i) => i !== pos);
        expect(shown).toHaveLength(3);
        const last = Number(count);
        const sorted = [...shown, last].sort((a, b) => a - b);
        expect(new Set(sorted).size).toBe(4);
        expect(sorted[0]).toBeGreaterThan(0);
        expect(sorted[3]).toBeLessThanOrEqual(p.maximum);
        expect(shown.every(n => n % p.minorStep === 0)).toBe(true);
        expect(last % p.minorStep).toBe(p.minorStep / 2);
        const completed = q.workedSteps?.find(s => s.picture)?.picture;
        const fullCounts = p.values.map((n, i) => i === pos ? last : n);
        expect(completed).toEqual({ ...p, values: fullCounts });
        expect(q.unit).toBe('bookmarks');
        expect(q.answer).toBe(String(sorted[3] - sorted[0]));
        unplottedRanks.add(last === sorted[0] ? 'least' : last === sorted[3] ? 'most' : 'between');
      } else if (p?.type === 'raffles-p3' && p.layout === 'grouped-bars') {
        forms.add('group totals');
        const [a, b] = read(q.prompt, /cards did the class collect on (\w+) and (\w+) altogether/);
        const [c, d] = read(q.prompt, /more items did the class collect on (\w+) than on (\w+)/);
        const bar = (series: string, day: string) => {
          const n = p.series.find(s => s.label === series)?.values[p.days.indexOf(day)];
          if (n === undefined) throw new Error('Missing bar for ' + series + ' on ' + day);
          expect(n).toBeGreaterThan(0);
          expect(n % p.scale).toBe(0);
          return n;
        };
        expect(new Set([a, b])).toEqual(new Set([c, d]));
        const cards = bar('Cards', a) + bar('Cards', b);
        // Regroup by item instead of adding each day's total as in the worked solution.
        const bookChange = bar('Notebooks', c) - bar('Notebooks', d);
        const cardChange = bar('Cards', c) - bar('Cards', d);
        expect(bookChange * cardChange).toBeLessThan(0);
        expect(bookChange + cardChange).toBeGreaterThan(0);
        expect(q.structuredResponse?.kind).toBe('number-pair');
        expect(q.answer).toBe(JSON.stringify([String(cards), String(bookChange + cardChange)]));
      } else if (p?.type === 'bars') {
        forms.add('claims');
        const lines = q.context!;
        const [sum] = read(lines[1], /In all, (\d+) pupils/);
        const [least] = read(lines[2], /\(b\) (\w+) had the fewest/);
        const [gap, first, second] = read(lines[3], /(\d+) more pupils picked (\w+) than (\w+)/);
        const [twice, once] = read(lines[4], /picked (\w+) as (\w+)/);
        const count = (name: string) => {
          const i = p.labels.indexOf(name);
          if (i < 0) throw new Error('Missing club ' + name);
          return p.values[i];
        };
        expect(p.values.every(n => n > 0 && n % p.scale === 0)).toBe(true);
        const results = [
          p.values.reduce((s, n) => s + n, 0) === Number(sum),
          p.values.every(n => n >= count(least)),
          count(second) + Number(gap) === count(first),
          count(once) + count(once) === count(twice),
        ];
        results.forEach((v, i) => claimOutcomes[i].add(v));
        expect(q.answer).toBe(results.map(v => v ? 'T' : 'F').join(''));
        const reversed = count(first) + Number(gap) === count(second);
        differenceClaims.add(results[2] ? 'true' : reversed ? 'backwards' : 'wrong size');
      } else {
        throw new Error('Expected a count graph');
      }
    }
  }
  expect(forms.size).toBe(3);
  expect(unplottedRanks).toEqual(new Set(['least', 'most', 'between']));
  expect(differenceClaims).toEqual(new Set(['true', 'backwards', 'wrong size']));
  for (const outcomes of claimOutcomes) expect(outcomes.size).toBe(2);
});

it('repeats the same question for a seed and index and varies the visible data across indices', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(2025, index);
    expect(makeRagQuestion(2025, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(12);
});
