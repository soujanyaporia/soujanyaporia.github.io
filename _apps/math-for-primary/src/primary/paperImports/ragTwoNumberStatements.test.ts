import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragTwoNumberStatements';

function solveLine(line: string) {
  const match = /^\(([ab])\) Use (\d+) and (\d+): □ is (greater|smaller) than □\.$/.exec(line);
  if (!match) throw new Error(`Cannot read comparison: ${line}`);
  const [, part, left, right, word] = match;
  const given = [Number(left), Number(right)];
  const sorted = given.slice().sort((a, b) => a - b);
  if (word === 'greater') sorted.reverse();
  return { part, word, given, solution: sorted.map(String) };
}

it('grades all four gaps against the two visible sentences', () => {
  for (const seed of [-9, 0, 1, 7, 23, 48, 95]) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const lines = (q.context ?? []).map(solveLine);
      expect(lines.map(l => [l.part, l.word])).toEqual([['a', 'greater'], ['b', 'smaller']]);
      const spec = q.structuredResponse;
      if (spec?.kind !== 'number-fields') throw new Error('Expected four numeric gaps');
      expect(spec.fields.map(f => f.label)).toEqual(['(a) Left gap', '(a) Right gap', '(b) Left gap', '(b) Right gap']);
      const expected = lines.flatMap(l => l.solution);
      expect(q.answer).toBe(JSON.stringify(expected));
      const accepts = (slots: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(slots));
      expect(accepts(expected)).toBe(true);
      expect(accepts(expected.slice(0, 2))).toBe(false);
      for (let i = 0; i < 4; i++) {
        const wrong = expected.slice();
        wrong[i] = expected[i % 2 === 0 ? i + 1 : i - 1];
        expect(accepts(wrong)).toBe(false);
      }
      expect(q.workedSteps?.map(step => step.equation)).toEqual(lines.map(l => `${l.solution[0]} is ${l.word} than ${l.solution[1]}.`));
    }
  }
});

it('varies the visible pairs and their presentation order while preserving both place-value cases', () => {
  const orders = [new Set<boolean>(), new Set<boolean>()];
  const contexts = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    const q = makeRagQuestion(seed, 2);
    expect(makeRagQuestion(seed, 2)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
    const [a, b] = (q.context ?? []).map(solveLine);
    for (const [i, row] of [a, b].entries()) {
      const [x, y] = row.given;
      expect(x).not.toBe(y);
      expect(row.given.every(n => n >= 10 && n <= 99)).toBe(true);
      orders[i].add(x < y);
    }
    expect(Math.floor(a.given[0] / 10)).toBe(Math.floor(a.given[1] / 10));
    const [small, large] = b.solution.map(Number);
    expect(Math.floor(small / 10)).toBeLessThan(Math.floor(large / 10));
    expect(small % 10).toBeGreaterThan(large % 10);
  }
  expect(orders.map(set => set.size)).toEqual([2, 2]);
  expect(contexts.size).toBeGreaterThan(1);
});
