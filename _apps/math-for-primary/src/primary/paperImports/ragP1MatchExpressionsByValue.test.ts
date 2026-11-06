import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP1MatchExpressionsByValue';

// Read only what a pupil sees. Check the bounds as well as the arithmetic.
function value(label: string): number {
  const groups = /^(\d+) groups of (\d+)$/.exec(label);
  if (groups) {
    const n = Number(groups[1]), size = Number(groups[2]);
    expect(n).toBeGreaterThan(0);
    expect(size).toBeGreaterThan(0);
    let total = 0;
    for (let i = 0; i < n; i++) total += size;
    expect(total).toBeLessThanOrEqual(40);
    return total;
  }
  const m = /^(\d+) ([+−]) (\d+)$/.exec(label);
  if (!m) throw Error(`Unreadable card: ${label}`);
  const a = Number(m[1]), b = Number(m[3]);
  const result = m[2] === '+' ? a + b : a - b;
  for (const n of [a, b, result]) {
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThanOrEqual(20);
  }
  return result;
}

it('solves every visible card task and checks the exact response across seeds and indices', () => {
  const seen = new Set<string>();
  for (let seed = -3; seed < 21; seed++) for (let index = 0; index < 6; index++) {
    const q = makeRagQuestion(seed, index);
    const spec = q.structuredResponse;
    if (spec?.kind === 'number-fields') {
      seen.add('pair rows');
      const numbered = (q.context ?? []).map(line => {
        const m = /^Card (\d+): (\d+ − \d+)$/.exec(line);
        if (!m) throw Error(`Unreadable numbered card: ${line}`);
        return { number: m[1], label: m[2], result: value(m[2]) };
      });
      expect(numbered).toHaveLength(3);
      expect(new Set(numbered.map(c => c.number))).toEqual(new Set(['1', '2', '3']));
      const solution = spec.fields.map(field => {
        expect(field.label).toMatch(/^\d+ − \d+$/);
        const matches = numbered.filter(c => c.result === value(field.label));
        expect(matches).toHaveLength(1);
        expect(matches[0].label).not.toBe(field.label);
        return matches[0].number;
      });
      expect(solution).toHaveLength(3);
      expect(new Set(solution).size).toBe(3);
      expect(JSON.parse(q.answer)).toEqual(solution);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([solution[1], solution[0], solution[2]]))).toBe(false);
      continue;
    }

    const odd = q.prompt.includes('does not');
    const targetText = /make(?:s)? (\d+)\?$/i.exec(q.prompt);
    if (!q.display && !targetText) throw Error(`Missing target: ${q.prompt}`);
    const target = q.display ? value(q.display) : Number(targetText![1]);
    if (q.display) expect(q.display).toMatch(/^\d+ − \d+$/);
    const options = spec?.kind === 'named-pair' ? spec.options : q.choices ?? [];
    expect(new Set(options).size).toBe(options.length);
    if (q.display) expect(options).not.toContain(q.display);
    const correct = options.filter(c => odd ? value(c) !== target : value(c) === target);
    if (spec?.kind === 'named-pair') {
      expect(q.prompt).toContain('two cards');
      const grouped = options.some(c => c.includes('groups'));
      if (grouped) expect(options.every(c => c.includes('groups'))).toBe(true);
      seen.add(grouped ? 'two group cards' : 'two arithmetic cards');
      expect(options).toHaveLength(4);
      expect(correct).toHaveLength(2);
      expect([...JSON.parse(q.answer)].sort()).toEqual([...correct].sort());
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...correct].reverse()))).toBe(true);
      const wrong = options.find(c => !correct.includes(c));
      for (const bad of [[correct[0]], [correct[0], correct[0]], [correct[0], wrong]]) {
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(bad))).toBe(false);
      }
    } else {
      seen.add(q.display ? 'difference target' : odd ? 'exception' : 'single match');
      expect(options).toHaveLength(odd ? 4 : 3);
      expect(correct).toHaveLength(1);
      expect(q.answer).toBe(correct[0]);
      if (!odd && !q.display) {
        expect(options.every(c => /^\d+ − \d+$/.test(c))).toBe(true);
        expect(new Set(options.map(c => c.split(' − ')[1])).size).toBe(1);
      }
    }
  }
  expect(seen).toEqual(new Set(['pair rows', 'two group cards', 'two arithmetic cards', 'single match', 'difference target', 'exception']));
});

it('replays the same question and varies the visible givens', () => {
  const givens = new Set<string>();
  for (let seed = 0; seed < 12; seed++) for (let index = 0; index < 6; index++) {
    const q = makeRagQuestion(seed, index);
    expect(makeRagQuestion(seed, index)).toEqual(q);
    givens.add(JSON.stringify([q.prompt, q.display, q.context, q.choices, q.structuredResponse]));
  }
  expect(givens.size).toBeGreaterThan(36);
});
