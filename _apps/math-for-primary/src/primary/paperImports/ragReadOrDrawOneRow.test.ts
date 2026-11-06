import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragReadOrDrawOneRow';

it('solves the named row using just the picture, prompt and printed bean counts', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (graph?.type !== 'batch4-early') throw new Error('Expected a scaled picture graph');
      const { rows, scale } = graph;
      expect(rows).toHaveLength(4);
      expect(new Set(rows.map(row => row.label)).size).toBe(4);
      expect([2, 3, 4, 5, 10]).toContain(scale);
      const named = rows.filter(row => q.prompt.includes(row.label));
      expect(named).toHaveLength(1);
      const target = named[0];
      const units = (row: typeof target) => (2 * row.wholeSymbols + Number(row.halfSymbol)) * scale / 2;
      for (const row of rows) {
        expect(Number.isInteger(row.wholeSymbols) && row.wholeSymbols >= 0).toBe(true);
        expect(Number.isInteger(units(row))).toBe(true);
      }
      const blank = rows.filter(row => units(row) === 0);
      if (!blank.length) {
        seen.add(target.halfSymbol ? 'read-half' : 'read-whole');
        expect(q.prompt).toBe(`How many beans did ${target.label} plant?`);
        expect(q.unit).toBe('beans');
        const value = units(target);
        expect(q.answer).toBe(String(value));
        expect(correctAnswer(q, String(value + 1))).toBe(false);
        continue;
      }

      expect(blank).toEqual([target]);
      expect(q.prompt).toContain(`missing row for ${target.label}`);
      const sentences = q.context ?? [];
      const total = sentences.join(' ').match(/(\d+) beans altogether\./);
      const given = sentences.find(line => line.startsWith(`${target.label} planted `))?.match(/(\d+) beans\.$/);
      expect(Number(!!total) + Number(!!given)).toBe(1);
      const known = rows.reduce((sum, row) => sum + units(row), 0);
      const missing = total ? Number(total[1]) - known : Number(given?.[1]);
      expect(missing).toBeGreaterThan(0);
      expect(missing % scale).toBe(0);
      const circles = missing / scale;
      expect(circles).toBeLessThanOrEqual(7);
      const strip = 'O'.repeat(circles);
      const expected = total ? `${missing} ${strip}` : strip;
      seen.add(total ? 'linked' : 'given');
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected.toLowerCase())).toBe(true);
      expect(correctAnswer(q, expected + 'O')).toBe(false);
      expect(correctAnswer(q, String(circles))).toBe(false);
      if (total) {
        expect(q.prompt).toContain(`How many beans did ${target.label} plant?`);
        expect(correctAnswer(q, strip)).toBe(false);
        expect(correctAnswer(q, `${missing + 1} ${strip}`)).toBe(false);
      }
      const completion = q.workedSteps?.at(-1)?.picture;
      if (completion?.type !== 'batch4-early') throw new Error('Expected the finished graph in the solution');
      expect(completion).toEqual({
        ...graph, rows: rows.map(row => row === target ? { ...row, wholeSymbols: circles } : row),
      });
    }
  }
  expect([...seen].sort()).toEqual(['given', 'linked', 'read-half', 'read-whole']);
});

it('repeats a seed and index and varies the visible questions across a session', () => {
  const forms = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    forms.add(JSON.stringify([q.prompt, q.context, q.picture]));
  }
  expect(forms.size).toBeGreaterThan(8);
});
