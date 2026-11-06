import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragTransferGap';

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible count in: ${text}`);
  return Number(match[1]);
}

// Try actual transfers until the two resulting collections have the requested difference.
function matchingTransfers(iman: number, kai: number, target: number): number[] {
  const matches: number[] = [];
  for (let moved = 0; moved <= iman; moved++) {
    if ((iman - moved) - (kai + moved) === target) matches.push(moved);
  }
  return matches;
}

it('solves each form from the displayed counts, direction and requested result', () => {
  const forms = new Set<string>();
  const equalStarts = new Set<number>();
  for (let seed = -12; seed <= 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const [first, second] = q.context ?? [];
      expect(q.unit).toBe('buttons');
      let solutions: number[];
      if (q.prompt.includes('both tins hold the same number')) {
        expect(q.prompt).toContain('Iman pass to Kai');
        const kai = readCount(first, /^Kai counts (\d+) buttons in his tin\.$/);
        const factor = readCount(second, /^Iman has (\d+) times as many buttons as Kai\.$/);
        equalStarts.add(kai);
        solutions = matchingTransfers(kai * factor, kai, 0);
        forms.add(q.choices ? 'equal-choice' : 'equal-entry');
      } else {
        const gap = readCount(first, /^Iman starts with (\d+) more buttons than Kai\.$/);
        if (q.prompt.includes('Iman pass to Kai')) {
          const target = readCount(q.prompt, /finish with (\d+) more buttons than Kai\?$/);
          expect(target).toBeGreaterThan(0);
          expect(target).toBeLessThan(gap);
          // Adding the same starting amount to both tins preserves the solution.
          solutions = matchingTransfers(gap, 0, target);
          expect(matchingTransfers(gap + 17, 17, target)).toEqual(solutions);
          forms.add('target-gap');
        } else {
          expect(q.prompt).toBe('How many more buttons does Iman have than Kai now?');
          const given = readCount(second, /^Kai gives Iman (\d+) of his buttons\.$/);
          const kai = given + 11;
          const iman = kai + gap;
          solutions = [(iman + given) - (kai - given)];
          expect(solutions[0]).toBeGreaterThan(gap);
          forms.add('growing-gap');
        }
        expect(q.choices).toBeUndefined();
      }
      expect(solutions).toHaveLength(1);
      const expected = solutions[0];
      expect(Number.isSafeInteger(expected)).toBe(true);
      expect(expected).toBeGreaterThan(0);
      expect(q.answer).toBe(String(expected));
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(value => Number(value) === expected)).toHaveLength(1);
      }
    }
  }
  expect(forms.size).toBe(4);
  expect(equalStarts.size).toBeGreaterThan(1);
});

it('reproduces the complete question, including choice order, for the same seed and index', () => {
  for (const seed of [0, 13, 2048]) {
    for (let index = 0; index < 8; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
