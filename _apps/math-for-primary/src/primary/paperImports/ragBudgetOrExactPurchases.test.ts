import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragBudgetOrExactPurchases';

function cents(tag: string): number {
  const coin = /^(\d+)¢$/.exec(tag);
  if (coin) return Number(coin[1]);
  const money = /^\$(\d+)(?:\.(\d{2}))?$/.exec(tag);
  if (!money) throw new Error('Unreadable value on a price tag or money tile: ' + tag);
  return 100 * Number(money[1]) + Number(money[2] ?? 0);
}

it('finds exactly one purchase from the displayed money, price tags and prompt', () => {
  const cases = new Set<string>();
  for (let seed = -2; seed < 38; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const [intro, ...tags] = q.context ?? [];
      const menu = tags.map(tag => {
        const [label, price] = tag.split(' — ');
        return { label, price: cents(price), tag: price };
      });
      const single = q.prompt.includes('one item');
      const exact = q.prompt.includes('use up all');
      expect(q.prompt).toContain(single ? 'one item' : 'two different items');
      expect(menu).toHaveLength(single ? 4 : 3);
      expect(new Set(menu.map(item => item.label)).size).toBe(menu.length);
      expect(menu.every(item => item.price > 0)).toBe(true);

      let budget: number;
      if (single || exact) {
        if (q.picture?.type !== 'pattern') throw new Error('Expected visible money tiles');
        const tokens = q.picture.items;
        const notes = tokens.filter(token => token.startsWith('$'));
        const coins = tokens.filter(token => token.endsWith('¢'));
        expect(notes.length).toBeGreaterThan(1);
        expect(notes.every(note => ['$2', '$5', '$10', '$50'].includes(note))).toBe(true);
        expect(coins.every(coin => ['5¢', '10¢', '20¢', '50¢'].includes(coin))).toBe(true);
        expect(coins.length > 0).toBe(single);
        expect(tokens.length).toBe(notes.length + coins.length);
        budget = tokens.reduce((total, token) => total + cents(token), 0);
      } else {
        const amount = /\$\d+/.exec(intro);
        if (!amount) throw new Error('Expected the budget in the story');
        budget = cents(amount[0]);
      }
      expect(budget).toBeGreaterThan(0);
      expect(budget).toBeLessThanOrEqual(10000);
      if (single) {
        expect(menu.every(item => /^\$\d+\.\d{2}$/.test(item.tag))).toBe(true);
        const affordable = menu.filter(item => item.price <= budget);
        expect(affordable).toHaveLength(1);
        expect(q.choices?.slice().sort()).toEqual(menu.map(item => item.label).sort());
        expect(q.answer).toBe(affordable[0].label);
        cases.add(affordable[0].price === budget ? 'single at budget' : 'single below budget');
        continue;
      }

      const pairs = menu.flatMap((item, i) => menu.slice(i + 1).map(other => ({
        labels: [item.label, other.label], total: item.price + other.price,
      })));
      const valid = pairs.filter(pair => exact ? pair.total === budget : pair.total <= budget);
      expect(valid).toHaveLength(1);
      const spec = q.structuredResponse;
      if (spec?.kind !== 'named-pair') throw new Error('Expected two item selectors');
      expect(spec.options.slice().sort()).toEqual(menu.map(item => item.label).sort());
      const labels = valid[0].labels;
      expect(JSON.parse(q.answer).sort()).toEqual(labels.slice().sort());
      for (const pair of pairs) {
        for (const order of [pair.labels, pair.labels.slice().reverse()]) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(order))).toBe(pair === valid[0]);
        }
      }
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([labels[0], labels[0]]))).toBe(false);
      if (exact) {
        expect(pairs.some(pair => pair.total < budget)).toBe(true);
        expect(pairs.some(pair => pair.total > budget)).toBe(true);
        cases.add('exact pair');
      } else {
        cases.add(valid[0].total === budget ? 'pair at budget' : 'pair below budget');
      }
    }
  }
  expect(cases).toEqual(new Set(['single at budget', 'single below budget', 'pair at budget', 'pair below budget', 'exact pair']));
});

it('reproduces each shopping problem and varies the visible givens across a session', () => {
  const visible = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(17, index);
    expect(q).toEqual(makeRagQuestion(17, index));
    visible.add(JSON.stringify([q.context, q.picture]));
  }
  expect(visible.size).toBeGreaterThanOrEqual(8);
});
