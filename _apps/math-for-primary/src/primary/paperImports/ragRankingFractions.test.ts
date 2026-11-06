import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragRankingFractions';

it('solves every response form from the cards, fraction choices or labelled ribbon shares', () => {
  const forms = new Map<string, Set<string>>();
  for (let seed = 0; seed < 120; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const named = q.prompt.startsWith('Who');
      let givens: { card: string; choice: string }[];
      if (named) {
        expect(q.context?.[0]).toContain('same length');
        givens = (q.context ?? []).slice(1).map(line => {
          const match = /^(\w+) colours (\d+\/\d+) of a ribbon\.$/.exec(line);
          if (!match) throw new Error(`Unreadable ribbon share: ${line}`);
          return { card: match[2], choice: match[1] };
        });
        expect([...(q.choices ?? [])].sort()).toEqual(givens.map(g => g.choice).sort());
        expect(new Set(q.choices).size).toBe(4);
      } else {
        givens = (q.order ?? q.choices ?? []).map(card => ({ card, choice: card }));
      }
      expect(givens).toHaveLength(q.order ? 3 : 4);
      const fractions = givens.map(g => {
        expect(g.card).toMatch(/^\d+\/\d+$/);
        const [n, d] = g.card.split('/').map(Number);
        expect(n).toBeGreaterThan(0);
        expect(d).toBeGreaterThan(n);
        expect(d).toBeLessThanOrEqual(12);
        return { ...g, n, d };
      });
      expect(new Set(fractions.map(f => f.d)).size).toBe(fractions.length);

      // Solve on an integer scale derived solely from the displayed denominators.
      const scale = fractions.reduce((product, f) => product * f.d, 1);
      const ranked = fractions.map(f => ({ ...f, parts: (scale / f.d) * f.n }))
        .sort((a, b) => b.parts - a.parts);
      expect(new Set(ranked.map(f => f.parts)).size).toBe(ranked.length);
      const labels = ranked.map(f => f.card);
      const expected = q.order ? labels.join(',') : ranked[0].choice;
      expect(q.answer).toBe(expected);
      expect(q.workedSteps?.at(-1)?.equation).toBe(labels.join(' > '));
      if (q.order) {
        expect(q.prompt).toContain('largest first');
        expect(q.order.join(',')).not.toBe(expected);
      }

      const equalTops = fractions.every(f => f.n === fractions[0].n);
      if (equalTops) {
        expect(q.order).toBeDefined();
        expect(q.workedSteps?.[0].equation).toBe(ranked.map(f => f.d).join(' < '));
      } else {
        const equations = q.workedSteps?.[0].equation?.split(', ') ?? [];
        expect(equations).toHaveLength(fractions.length);
        const commonDenominators = equations.map((equation, i) => {
          const match = /^(\d+\/\d+) = (\d+)\/(\d+)$/.exec(equation);
          if (!match) throw new Error(`Unreadable conversion: ${equation}`);
          const f = fractions[i];
          expect(match[1]).toBe(f.card);
          expect(Number(match[3])).toBeGreaterThan(0);
          expect(Number(match[3])).toBeLessThanOrEqual(24);
          expect(Number(match[2]) * f.d).toBe(f.n * Number(match[3]));
          return Number(match[3]);
        });
        expect(new Set(commonDenominators).size).toBe(1);
      }
      const form = equalTops ? 'equal numerators' : q.order ? 'descending' : named ? 'owner' : 'greatest';
      const sets = forms.get(form) ?? new Set<string>();
      sets.add(labels.join(','));
      forms.set(form, sets);
    }
  }
  expect([...forms.keys()].sort()).toEqual(['descending', 'equal numerators', 'greatest', 'owner']);
  for (const sets of forms.values()) expect(sets.size).toBeGreaterThan(3);
});

it('reproduces each question from its seed and index', () => {
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  expect(makeRagQuestion(73, 9)).toEqual(makeRagQuestion(73, 9));
});
