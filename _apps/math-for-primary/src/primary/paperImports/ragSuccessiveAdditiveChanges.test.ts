import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { validNumberSentence } from '../answerFormat';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragSuccessiveAdditiveChanges';

// Read the three printed clues. Follow the names, irrespective of clue order.
function readStory(q: Question) {
  const known: { who: string; n: number; unit: string }[] = [];
  const edges: { who: string; ref: string; change: number; unit: string }[] = [];
  for (const line of q.context ?? []) {
    const edge = /^(\w+) (?:made|packed|found) (\d+) (more|fewer) (.+) than (\w+)\.$/.exec(line);
    if (edge) {
      edges.push({ who: edge[1], ref: edge[5], change: Number(edge[2]) * (edge[3] === 'more' ? 1 : -1), unit: edge[4] });
    } else {
      const start = /^(\w+) (?:made|packed|found) (\d+) (.+)\.$/.exec(line);
      if (!start) throw Error('Unreadable clue: ' + line);
      known.push({ who: start[1], n: Number(start[2]), unit: start[3] });
    }
  }
  expect(known).toHaveLength(1);
  expect(edges).toHaveLength(2);
  const [a] = known;
  const b = edges.find(e => e.ref === a.who);
  const c = edges.find(e => e.ref === b?.who);
  if (!b || !c || new Set([a.who, b.who, c.who]).size !== 3) throw Error('Not a chain of three children');
  expect([b.unit, c.unit]).toEqual([a.unit, a.unit]);
  const names = [a.who, b.who, c.who];
  const counts = [a.n, a.n + b.change, a.n + b.change + c.change];
  const signs = [b.change, c.change].map(n => n > 0 ? '+' : '-');
  const equations = [b, c].map((e, i) => `${counts[i]} ${signs[i]} ${Math.abs(e.change)} = ${counts[i + 1]}`);
  return { names, counts, unit: a.unit, signs: signs.join(''), equations };
}

it('solves every labelled response from the story and checks the working', () => {
  const seen = new Set<string>();
  for (let seed = -8; seed < 32; seed++) {
    for (let i = 0; i < 10; i++) {
      const q = makeRagQuestion(seed, i);
      const { names, counts, unit, signs, equations } = readStory(q);
      expect(counts.every(n => Number.isInteger(n) && n > 0 && n <= 100)).toBe(true);
      const working = q.workedSteps?.map(s => s.equation?.replace(/−/g, '-'));
      const part = /^Part \(([ab])\):/.exec(q.prompt)?.[1];
      if (part) {
        expect(signs).toBe('+-');
        const k = part === 'a' ? 0 : 1;
        expect(q.prompt).toContain(`How many ${unit} did ${names[k + 1]} `);
        expect(working).toEqual(equations.slice(0, k + 1));
        const spec = q.numberSentence;
        if (!spec) throw Error('Missing equation entry');
        expect(spec.freeEntry && spec.chooseOperation && spec.missingResult).toBe(true);
        expect(q.answer).toBe(equations[k]);
        expect(validNumberSentence(spec, equations[k])).toBe(true);
        const wrong = k === 0 ? equations[k].replace('+', '-') : equations[k].replace('-', '+');
        expect(validNumberSentence(spec, wrong)).toBe(false);
        seen.add('turn-' + part);
      } else {
        const total = q.prompt.includes('altogether');
        const sum = counts.reduce((s, n) => s + n, 0);
        const labels = total ? [...names, 'All three together'] : names.slice(1);
        const values = total ? [...counts, sum] : counts.slice(1);
        if (total) {
          expect(signs).toBe('+-');
          expect(counts.every(n => n < 10) && sum <= 20).toBe(true);
        } else {
          expect(['++', '--']).toContain(signs);
          expect(q.prompt).toContain(`How many ${unit} did ${names[1]} `);
          expect(q.prompt).toContain(`How many did ${names[2]} `);
        }
        expect(working).toEqual(total ? [...equations, `${counts.join(' + ')} = ${sum}`] : equations);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-fields') throw Error('Missing count fields');
        expect(spec.fields.map(f => f.label)).toEqual(labels.map(n => `${n} (${unit})`));
        const input = (ns: number[]) => JSON.stringify(ns.map(String));
        expect(q.answer).toBe(input(values));
        expect(structuredResponseCorrect(spec, q.answer, input(values))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, input([...values].reverse()))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, input(values.slice(1)))).toBe(false);
        seen.add(total ? 'total' : signs);
      }
    }
  }
  expect([...seen].sort()).toEqual(['++', '--', 'total', 'turn-a', 'turn-b']);
});

it('keeps the two equations on the same story while varying the numbers between rounds', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    for (let round = 0; round < 2; round++) {
      const qs = Array.from({ length: 5 }, (_, k) => makeRagQuestion(seed, round * 5 + k));
      const k = qs.findIndex(q => q.prompt.startsWith('Part (a)'));
      if (k < 0 || k >= 4) throw Error('Missing linked pair');
      expect(qs[k + 1].prompt).toMatch(/^Part \(b\)/);
      expect(qs[k + 1].context).toEqual(qs[k].context);
      const { counts } = readStory(qs[k]);
      stories.add(counts.join(','));
      expect(qs[k + 1].numberSentence?.freeEntry).toBe(true);
      expect(makeRagQuestion(seed, round * 5 + k)).toEqual(qs[k]);
      expect(new Set(qs.map(q => q.key)).size).toBe(5);
    }
  }
  expect(stories.size).toBeGreaterThan(16);
});
