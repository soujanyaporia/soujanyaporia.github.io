import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4PositiveFactorLists';

it('solves each visible task by testing divisibility from 1 through the printed target', () => {
  const seen = new Set<string>();
  const squareForms = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const target = /factors of (\d+)\b/.exec(q.prompt);
      if (!target) throw new Error(`No target in: ${q.prompt}`);
      const n = Number(target[1]);
      expect(n).toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(100);
      const all: number[] = [];
      for (let v = 1; v <= n; v++) if (n % v === 0) all.push(v);
      let form: string;
      if (q.prompt.startsWith('What is the sum')) {
        form = 'sum';
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(all.reduce((s, v) => s + v, 0)));
      } else if (q.prompt.startsWith('Write all')) {
        form = 'list';
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw new Error('Expected factor entry fields');
        expect(spec.fields).toHaveLength(all.length);
        expect(all.length).toBeLessThanOrEqual(6);
        const expected = JSON.stringify(all.map(String));
        expect(q.answer).toBe(expected);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(all.slice(0, -1).map(String)))).toBe(false);
      } else {
        const printed = /^Factors already listed: ([\d, ]+)\.$/.exec(q.context?.[0] ?? '');
        if (!printed) throw new Error('No supplied factor list');
        const given = printed[1].split(', ').map(Number);
        expect(given).toHaveLength(4);
        expect(new Set(given).size).toBe(given.length);
        expect(given.every(v => all.includes(v))).toBe(true);
        expect(given).toEqual(expect.arrayContaining([1, n]));
        const missing = all.filter(v => !given.includes(v));
        expect(missing).toHaveLength(2);
        if (q.prompt.startsWith('Which two')) {
          form = 'missing';
          const spec = q.structuredResponse;
          if (spec?.kind !== 'number-pair') throw new Error('Expected two factor fields');
          const expected = JSON.stringify(missing.map(String));
          expect(q.answer).toBe(expected);
          expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(missing[0]), String(missing[0])]))).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(missing.slice().reverse().map(String)))).toBe(false);
        } else {
          form = 'pair';
          expect(q.prompt).toMatch(/^Which pair/);
          const options = q.choices ?? [];
          expect(options).toHaveLength(4);
          expect(new Set(options).size).toBe(4);
          const valid = options.filter(option => {
            const pair = /^(\d+) and (\d+)$/.exec(option);
            if (!pair) throw new Error(`Unreadable option: ${option}`);
            const [a, b] = pair.slice(1).map(Number);
            return a !== b && missing.includes(a) && missing.includes(b);
          });
          expect(valid).toHaveLength(1);
          expect(q.answer).toBe(valid[0]);
        }
      }
      seen.add(form);
      if (Number.isInteger(Math.sqrt(n))) squareForms.add(form);
    }
  }
  expect([...seen].sort()).toEqual(['list', 'missing', 'pair', 'sum']);
  expect(squareForms.has('list')).toBe(true);
  expect(squareForms.has('sum')).toBe(true);
});

it('reproduces a seeded question and varies the visible task across an eight-question session', () => {
  const signatures = new Set<string>();
  for (let index = 0; index < 8; index++) {
    const q = makeRagQuestion(-17, index);
    expect(makeRagQuestion(-17, index)).toEqual(q);
    signatures.add(JSON.stringify([q.prompt, q.context, q.choices]));
  }
  expect(signatures.size).toBeGreaterThanOrEqual(4);
});
