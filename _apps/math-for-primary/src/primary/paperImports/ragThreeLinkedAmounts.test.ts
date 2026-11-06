import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragThreeLinkedAmounts';

// Try whole-dollar values for the amount both comparisons refer to.
// Keep only a table of amounts that satisfies every printed clue.
function solve(context: string[]) {
  const text = context.join('\n').toLowerCase().replace(/\bthe /g, '');
  const given = /^([a-z ]+) (?:saved|costs) \$(\d+)\.00\.$/m.exec(text);
  const gap = /^([a-z ]+) (?:saved|costs) \$(\d+)\.00 (more|less) than ([a-z ]+)\.$/m.exec(text);
  const mult = /^([a-z ]+) (?:saved|costs) (\d+) times as much as ([a-z ]+)\.$/m.exec(text);
  if (!given || !gap || !mult) throw Error('Missing money clue');
  const base = gap[4];
  expect(mult[3]).toBe(base);
  expect(new Set([base, gap[1], mult[1]]).size).toBe(3);
  expect(Number(mult[2])).toBeGreaterThan(1);
  expect(Number(mult[2])).toBeLessThan(10);
  expect(Number(gap[2])).toBeGreaterThan(0);
  const matches: Record<string, number>[] = [];
  for (let value = 1; value <= 999; value++) {
    const amounts = {
      [base]: value,
      [gap[1]]: value + Number(gap[2]) * (gap[3] === 'more' ? 1 : -1),
      [mult[1]]: value * Number(mult[2]),
    };
    if (amounts[given[1]] === Number(given[2]) && Object.values(amounts).every(n => n > 0)) matches.push(amounts);
  }
  expect(matches).toHaveLength(1);
  return { amounts: matches[0], given: given[1], base, scaled: mult[1], offset: gap[1], direction: gap[3] };
}

it('solves each form from the printed facts and checks all requested answers', () => {
  const forms = new Set<string>(), winners = new Set<string>(), codes = new Set<string>();
  for (let seed = -8; seed < 48; seed++) {
    for (const index of [0, 1, 4, 9]) {
      const q = makeRagQuestion(seed, index);
      const context = q.context ?? [];
      const s = solve(context);
      const total = Object.values(s.amounts).reduce((a, b) => a + b, 0);
      expect(total).toBeLessThan(10000);
      if (s.given === s.base) {
        forms.add('base given');
        expect(s.direction).toBe('more');
        expect(q.prompt).toMatch(/\(a\).*label number.*price[\s\S]+\(b\).*one of each/);
        const ranked = Object.entries(s.amounts).sort((a, b) => b[1] - a[1]);
        const [item, price] = ranked[0];
        expect(price).toBeGreaterThan(ranked[1][1]);
        const pairs = [...context.join('\n').matchAll(/\b([1-3]) = ([a-z ]+)(?=[;.])/g)];
        expect(pairs.map(m => m[2]).sort()).toEqual(Object.keys(s.amounts).sort());
        expect(new Set(pairs.map(m => m[1])).size).toBe(3);
        const code = pairs.find(m => m[2] === item)![1];
        winners.add(item);
        codes.add(code);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw Error('Need three linked answer fields');
        expect(spec.fields.map(f => f.label)).toEqual(['(a) Item label number', '(a) Price of that item ($)', '(b) Total price ($)']);
        const entries = [code, price.toFixed(2), total.toFixed(2)];
        const accepts = (parts: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(parts));
        expect(accepts(entries)).toBe(true);
        expect(accepts([String(Number(code) % 3 + 1), ...entries.slice(1)])).toBe(false);
        expect(accepts([code, String(ranked[1][1]), entries[2]])).toBe(false);
        expect(accepts([code, entries[1], String(total - price)])).toBe(false);
        expect(accepts(entries.slice(0, 2))).toBe(false);
      } else {
        if (s.given === s.scaled) {
          forms.add('multiple given');
          expect(s.direction).toBe('more');
          expect(s.amounts[s.given]).toBeLessThan(1000);
          expect(q.prompt).toMatch(/save in all/);
        } else {
          forms.add('cheaper amount given');
          expect(s.given).toBe(s.offset);
          expect(s.direction).toBe('less');
          expect(q.prompt).toMatch(/buy one bench, one table and one cabinet/);
        }
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(String(total));
      }
    }
  }
  expect(forms.size).toBe(3);
  expect(winners.size).toBe(2);
  expect(codes.size).toBe(3);
});

it('reproduces the same question and varies the printed data across session indices', () => {
  const variants = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(91, index);
    expect(makeRagQuestion(91, index)).toEqual(q);
    variants.add(JSON.stringify(q.context));
  }
  expect(variants.size).toBeGreaterThanOrEqual(8);
});
