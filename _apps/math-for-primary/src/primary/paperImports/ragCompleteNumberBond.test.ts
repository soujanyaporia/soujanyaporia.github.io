import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragCompleteNumberBond';

function readWhole(label: string): number {
  const match = /^Whole (\d+)$/.exec(label);
  if (!match) throw new Error(`Expected a numerical whole in ${label}`);
  return Number(match[1]);
}

it('solves the bonds from their displayed labels and checks each response form', () => {
  const pairedPictures = new Set<string>();
  const linkedPictures = new Set<string>();
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const pic = q.picture;
      if (pic?.type !== 'paper' || pic.layout !== 'bars') throw new Error('Missing bond rows');
      const rows = pic.rows;
      for (const row of rows) expect(row.parts).toHaveLength(2);
      expect(q.unit).toBeUndefined();
      expect(q.choices).toBeUndefined();

      if (rows.length === 2) {
        pairedPictures.add(JSON.stringify(rows));
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Top row', secondLabel: 'Bottom row' });
        expect(rows[0].label).toBe(rows[1].label);
        const expected = rows.map(row => {
          const whole = readWhole(row.label);
          const [known, gap] = row.parts.map(part => part.label);
          expect(known).toMatch(/^\d+$/);
          expect(gap).toBe('?');
          expect(whole).toBeLessThanOrEqual(10);
          expect(Number(known)).toBeGreaterThan(0);
          expect(Number(known)).toBeLessThan(whole);
          return String(whole - Number(known));
        });
        expect(expected[0]).not.toBe(expected[1]);
        expect(q.answer).toBe(JSON.stringify(expected));
        expect(correctAnswer(q, JSON.stringify(expected))).toBe(true);
        expect(correctAnswer(q, JSON.stringify([expected[1], expected[0]]))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([expected[0]]))).toBe(false);
        expect(q.workedSteps).toHaveLength(2);
      } else {
        expect(rows).toHaveLength(3);
        linkedPictures.add(JSON.stringify(rows));
        expect(q.structuredResponse).toBeUndefined();
        const values = new Map<string, number>();
        const equations: string[] = [];
        for (const row of rows.slice(0, 2)) {
          const whole = readWhole(row.label);
          expect(whole).toBeLessThanOrEqual(20);
          const labels = row.parts.map(part => part.label);
          const given = labels.filter(label => /^\d+$/.test(label));
          const shapes = labels.filter(label => !/^\d+$/.test(label));
          expect(given).toHaveLength(1);
          expect(shapes).toHaveLength(1);
          const known = Number(given[0]);
          const missing = whole - known;
          expect(known).toBeGreaterThan(0);
          expect(missing).toBeGreaterThan(0);
          values.set(shapes[0], missing);
          equations.push(`${whole} − ${known} = ${missing}`);
        }
        expect(values.size).toBe(2);
        const finalParts = rows[2].parts.map(part => part.label);
        expect(rows[2].label).toBe('Whole ★');
        expect(q.prompt).toContain('★');
        expect([...finalParts].sort()).toEqual([...values.keys()].sort());
        const [left, right] = finalParts.map(label => values.get(label)!);
        const expected = left + right;
        expect(expected).toBeLessThanOrEqual(20);
        expect(q.answer).toBe(String(expected));
        expect(correctAnswer(q, String(expected))).toBe(true);
        expect(correctAnswer(q, String(left))).toBe(false);
        expect(correctAnswer(q, String(right))).toBe(false);
        equations.push(`${left} + ${right} = ${expected}`);
        expect(q.workedSteps?.map(step => step.equation)).toEqual(equations);
      }
    }
  }
  expect(pairedPictures.size).toBeGreaterThan(5);
  expect(linkedPictures.size).toBeGreaterThan(10);
});

it('replays the same question for the same seed and index', () => {
  for (const seed of [-17, 0, 29]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 4)).toEqual(makeRagQuestion(seed, 4));
  }
});
