import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPaymentCostBalance';

function readCents(line: string): number[] {
  return Array.from(line.matchAll(/\$(\d+)\b|(\d+)¢/g), match =>
    match[1] === undefined ? Number(match[2]) : 100 * Number(match[1]));
}

it('solves the visible money stories and checks the units and working', () => {
  const seen = new Set<string>();
  for (let seed = -12; seed <= 36; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const lines = q.context ?? [];
      const isOutlay = (line: string) => /\b(buys|gives)\b/.test(line);
      const costs = lines.filter(isOutlay).flatMap(readCents);
      const knownLines = lines.filter(line => !isOutlay(line));
      expect(knownLines).toHaveLength(1);
      const fact = knownLines[0] ?? '';
      const knownAmounts = readCents(fact);
      expect(knownAmounts).toHaveLength(1);
      const known = knownAmounts[0]!;
      const asksStart = q.prompt.includes('at first');
      const cents = q.prompt.includes('cents');
      const unit = cents ? 'cents' : 'dollars';
      expect(q.prompt).toContain(unit);
      expect(q.unit).toBe(unit);
      expect(fact).toMatch(asksStart ? /has \$\d+ left/ : /starts with|hands the cashier/);
      expect(costs.length).toBeGreaterThanOrEqual(cents ? 1 : 2);
      expect(costs.length).toBeLessThanOrEqual(2);

      // Work forwards by removing each outlay, or undo each outlay from the balance.
      const scale = cents ? 1 : 100;
      const expected = costs.reduce((balance, cost) => asksStart ? balance + cost : balance - cost, known) / scale;
      for (const value of [known / scale, ...costs.map(cost => cost / scale), expected]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(999);
      }
      expect(q.answer).toBe(String(expected));
      const format = (value: number) => cents ? `${value}¢` : `$${value}`;
      const equations = (q.workedSteps ?? []).map(step => step.equation);
      if (cents) expect(equations[0]).toBe(`$${known / 100} = ${known}¢`);
      const parts = costs.map(cost => cost / scale);
      const total = parts.reduce((sum, value) => sum + value, 0);
      if (parts.length === 2) expect(equations).toContain(`${parts.map(format).join(' + ')} = ${format(total)}`);
      const finalOperation = asksStart ? `${format(total)} + ${format(known / scale)}` : `${format(known / scale)} − ${format(total)}`;
      expect(equations.at(-1)).toBe(`${finalOperation} = ${format(expected)}`);
      const story = asksStart ? 'start' : fact.includes('starts with') ? 'gift' : 'change';
      seen.add(`${story}/${unit}/${costs.length}`);
    }
  }
  expect(seen).toEqual(new Set(['change/cents/1', 'change/cents/2', 'change/dollars/2', 'gift/dollars/2', 'start/dollars/2']));
});

it('repeats a seed and index exactly while varying the visible amounts across seeds', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 60; seed += 5) {
    const q = makeRagQuestion(seed, 2);
    expect(makeRagQuestion(seed, 2)).toEqual(q);
    stories.add((q.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(1);
});
