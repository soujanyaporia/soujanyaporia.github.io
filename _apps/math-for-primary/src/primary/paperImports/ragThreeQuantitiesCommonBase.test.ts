import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragThreeQuantitiesCommonBase';

it('finds exactly one whole-number answer from the total and both comparisons', () => {
  const seenTargets = new Set<string>();
  const seenOrders = new Set<number>();
  for (let seed = -8; seed <= 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const [sumLine, firstLine, secondLine] = q.context ?? [];
      const sum = /^The red, blue and green tins hold (\d+) buttons altogether\.$/.exec(sumLine);
      const comparison = /^The (red|blue|green) tin has (\d+) more buttons than the (red|blue|green) tin\.$/;
      const first = comparison.exec(firstLine);
      const second = comparison.exec(secondLine);
      if (!sum || !first || !second) throw new Error('Expected a total and two button comparisons');
      const total = Number(sum[1]);
      const firstGap = Number(first[2]);
      const secondGap = Number(second[2]);
      expect(second[3]).toBe(first[1]);
      expect(new Set([first[3], first[1], second[1]]).size).toBe(3);
      expect(q.prompt).toBe('How many buttons are in the ' + first[3] + ' tin?');
      expect(q.unit).toBe('buttons');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(firstGap).toBeGreaterThan(0);
      expect(secondGap).toBeGreaterThan(0);
      expect(total).toBeLessThan(1000);

      // Try each possible count in the named tin and build the two fuller tins.
      const solutions: number[] = [];
      for (let count = 1; count <= total; count++) {
        const middle = count + firstGap;
        const largest = middle + secondGap;
        if (count + middle + largest === total) solutions.push(count);
      }
      expect(solutions).toHaveLength(1);
      expect(q.answer).toBe(String(solutions[0]));
      const equalTotal = 3 * solutions[0];
      expect(q.workedSteps?.map(step => step.equation)).toContain(
        equalTotal + ' ÷ 3 = ' + solutions[0],
      );
      seenTargets.add(first[3]);
      seenOrders.add(Math.sign(firstGap - secondGap));
    }
  }
  expect(seenTargets.size).toBe(3);
  expect(seenOrders).toEqual(new Set([-1, 1]));
});

it('replays a question and varies the visible givens with both inputs', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(-31, 7)).toEqual(makeRagQuestion(-31, 7));
  const contexts = (f: (n: number) => ReturnType<typeof makeRagQuestion>) =>
    new Set(Array.from({ length: 12 }, (_, n) => JSON.stringify(f(n).context)));
  expect(contexts(seed => makeRagQuestion(seed, 4)).size).toBeGreaterThan(1);
  expect(contexts(index => makeRagQuestion(9, index)).size).toBeGreaterThan(1);
});
