import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragReferenceFractionSelection';

function readFraction(text: string) {
  const match = /^(\d+)\/(\d+)$/.exec(text);
  if (!match) throw new Error(`Expected a printed fraction, got ${text}`);
  return { top: Number(match[1]), bottom: Number(match[2]) };
}

test('solves the visible list independently and checks what the pupil can submit', () => {
  const forms = new Set<string>();
  for (let seed = -5; seed < 55; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const referenceText = q.prompt.match(/\b\d+\/\d+\b/g) ?? [];
      expect(referenceText).toHaveLength(1);
      const reference = readFraction(referenceText[0] ?? '');
      const options = q.choices ?? (q.display ?? '').split(', ');
      const values = options.map(readFraction);
      for (const { top, bottom } of values) {
        expect(top).toBeGreaterThan(0);
        expect(top).toBeLessThan(bottom);
        expect(bottom).toBeLessThanOrEqual(12);
      }
      expect(new Set(values.map(v => v.bottom)).size).toBe(options.length);
      expect(new Set(values.map(v => v.top / v.bottom)).size).toBe(options.length);
      const differences = values.map(v => v.top * reference.bottom - reference.top * v.bottom);
      const expected = options.filter((_, i) => differences[i] < 0);

      if (q.structuredResponse) {
        forms.add('pair');
        expect(referenceText[0]).toBe('1/2');
        expect(q.prompt).toContain('two fractions');
        expect(options).toHaveLength(4);
        expect(expected).toHaveLength(2);
        expect(q.structuredResponse).toEqual({ kind: 'named-pair', options });
        expect([...JSON.parse(q.answer)].sort()).toEqual([...expected].sort());
        for (const first of options) {
          for (const second of options) {
            const valid = first !== second && expected.includes(first) && expected.includes(second);
            expect(correctAnswer(q, JSON.stringify([first, second]))).toBe(valid);
          }
        }
        expect(correctAnswer(q, JSON.stringify([expected[0]]))).toBe(false);
      } else {
        forms.add(q.choices ? 'choice' : 'written');
        expect(referenceText[0]).toBe(q.choices ? '1/2' : '1/3');
        expect(options).toHaveLength(q.choices ? 4 : 3);
        expect(differences.filter(d => d === 0)).toHaveLength(q.choices ? 1 : 0);
        expect(expected).toHaveLength(1);
        expect(q.answer).toBe(expected[0]);
        for (const option of options) expect(correctAnswer(q, option)).toBe(option === expected[0]);
      }
    }
  }
  expect(forms).toEqual(new Set(['written', 'choice', 'pair']));
});

test('repeats a seed and index exactly while offering different lists across a session', () => {
  const lists = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(71, index);
    expect(makeRagQuestion(71, index)).toEqual(q);
    lists.add(q.display ?? q.choices!.join(', '));
  }
  expect(lists.size).toBeGreaterThan(8);
});
