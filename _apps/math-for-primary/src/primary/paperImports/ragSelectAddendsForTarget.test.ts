import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragSelectAddendsForTarget';

const numbersIn = (line: string) => (line.match(/\d+/g) ?? []).map(Number);

it('has exactly one selectable triple or one complete matching, recoverable from the visible numbers', () => {
  const tripleBoards = new Set<string>();
  const pairBoards = new Set<string>();
  for (let seed = -12; seed < 48; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const totals = numbersIn(q.prompt);
      expect(totals).toHaveLength(1);
      const [target] = totals;
      const spec = q.structuredResponse;
      if (spec?.kind === 'number-fields') {
        const cards = numbersIn(q.display ?? '');
        expect(cards).toHaveLength(5);
        expect(new Set(cards).size).toBe(5);
        expect(cards.every(n => n >= 1 && n <= 9)).toBe(true);
        expect(target).toBeLessThanOrEqual(20);
        expect(spec.fields).toHaveLength(3);
        const solutions: string[][] = [];
        for (let mask = 0; mask < 2 ** cards.length; mask++) {
          const chosen = cards.filter((_, i) => (mask & (1 << i)) !== 0);
          if (chosen.length !== 3) continue;
          const reachesTarget = chosen.reduce((sum, n) => sum + n, 0) === target;
          const entry = chosen.map(String);
          if (reachesTarget) solutions.push(entry);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(entry))).toBe(reachesTarget);
        }
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(JSON.stringify(solutions[0]));
        const repeated = [solutions[0][0], solutions[0][0], solutions[0][2]];
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(repeated))).toBe(false);
        tripleBoards.add(`${q.display}/${target}`);
      } else if (spec?.kind === 'number-pair') {
        const starts = numbersIn(q.context?.find(line => line.startsWith('Start numbers:')) ?? '');
        const partners = numbersIn(q.context?.find(line => line.startsWith('Partner numbers:')) ?? '');
        expect(starts).toHaveLength(2);
        expect(partners).toHaveLength(2);
        const cards = [...starts, ...partners];
        expect(new Set(cards).size).toBe(4);
        expect(cards.every(n => n >= 1 && n <= 9)).toBe(true);
        expect(target).toBeGreaterThanOrEqual(8);
        expect(target).toBeLessThanOrEqual(12);
        expect(numbersIn(spec.firstLabel)).toEqual([starts[0]]);
        expect(numbersIn(spec.secondLabel)).toEqual([starts[1]]);
        const assignments = [partners, [...partners].reverse()];
        const solutions = assignments.filter(row => row.every((n, i) => n + starts[i] === target));
        expect(solutions).toHaveLength(1);
        expect(q.answer).toBe(JSON.stringify(solutions[0].map(String)));
        for (const row of assignments) {
          const entry = JSON.stringify(row.map(String));
          expect(structuredResponseCorrect(spec, q.answer, entry)).toBe(row === solutions[0]);
        }
        const repeated = JSON.stringify([String(partners[0]), String(partners[0])]);
        expect(structuredResponseCorrect(spec, q.answer, repeated)).toBe(false);
        pairBoards.add(`${cards.join(',')}/${target}`);
      } else {
        throw new Error('Expected three card fields or two labelled partner fields');
      }
    }
  }
  expect(tripleBoards.size).toBeGreaterThan(10);
  expect(pairBoards.size).toBeGreaterThan(10);
});

it('reproduces a question from its seed and index, including the default first index', () => {
  for (const seed of [-9, 0, 17, 103]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(makeRagQuestion(seed, 2)).toEqual(makeRagQuestion(seed, 2));
    expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 2).key);
  }
});
