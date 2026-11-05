import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragDoubleStartTransferFinalDifference';

test('the visible clues select a unique starting count for the top tray', () => {
  const transfers = new Set<number>();
  const finalDifferences = new Set<number>();

  for (let seed = 0; seed < 40; seed++) {
    for (const index of [0, 1, 5]) {
      const question = makeRagQuestion(seed, index);
      const [start = '', move = '', end = ''] = question.context ?? [];
      expect(start).toBe('The top tray held twice as many beads as the bottom tray.');
      expect(question.prompt).toContain('How many beads were in the top tray before Mei moved any?');
      const moveMatch = /^Mei moved (\d+) beads from the top tray to the bottom tray\.$/.exec(move);
      const endMatch = /^The top tray then held (\d+) more beads than the bottom tray\.$/.exec(end);
      if (!moveMatch || !endMatch) throw new Error('Missing transfer direction or final comparison');
      const moved = Number(moveMatch[1]);
      const difference = Number(endMatch[1]);
      expect(moved).toBeGreaterThan(0);
      expect(difference).toBeGreaterThan(0);
      transfers.add(moved);
      finalDifferences.add(difference);

      // Try whole-number starts and carry out the move on both trays.
      const solutions: number[] = [];
      for (let bottom = 1; bottom <= 200; bottom++) {
        const top = 2 * bottom;
        const topAfter = top - moved;
        const bottomAfter = bottom + moved;
        if (topAfter > 0 && topAfter - bottomAfter === difference) solutions.push(top);
      }
      expect(solutions).toHaveLength(1);
      expect(solutions[0]).toBeLessThan(200);
      expect(question.answer).toBe(String(solutions[0]));
      expect(question.unit).toBe('beads');
      expect(question.choices).toBeUndefined();
      expect(question.picture).toBeUndefined();
    }
  }
  expect(transfers.size).toBeGreaterThan(1);
  expect(finalDifferences.size).toBeGreaterThan(1);
});

test('seed and index reproduce the same question, including its working', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  expect(makeRagQuestion(17, 4)).toEqual(makeRagQuestion(17, 4));
  expect(makeRagQuestion(17, 4).key).not.toBe(makeRagQuestion(17, 0).key);
});
