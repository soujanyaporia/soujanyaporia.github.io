import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragThreeCountsDifferenceMultiple';

function readNumber(text: string, clue: RegExp): number {
  const match = clue.exec(text);
  if (!match) throw new Error(`Missing visible clue matching ${clue}`);
  return Number(match[1]);
}

it('finds exactly one blue count satisfying all three visible clues', () => {
  const factors = new Set<number>();
  for (let seed = -12; seed <= 24; seed++) {
    for (const index of [0, 1, 7]) {
      const question = makeRagQuestion(seed, index);
      const text = (question.context ?? []).join(' ');
      const total = readNumber(text, /shop has (\d+) buttons\. Each button is red, blue or green\./);
      const extra = readNumber(text, /There are (\d+) more red buttons than blue buttons\./);
      const factor = readNumber(text, /There are (\d+) times as many blue buttons as green buttons\./);
      factors.add(factor);
      expect(question.prompt).toContain('How many blue buttons are there?');
      expect(total).toBeGreaterThanOrEqual(1000);
      expect(total).toBeLessThan(10000);
      expect(extra).toBeGreaterThan(0);
      expect([2, 4]).toContain(factor);

      // Try each possible green count and check the shop total directly.
      const solutions: number[] = [];
      for (let green = 1; green <= total; green++) {
        const blue = green * factor;
        const red = blue + extra;
        if (red + blue + green === total) solutions.push(blue);
      }
      expect(solutions).toHaveLength(1);
      const [blue] = solutions;
      expect(question.answer).toBe(String(blue));
      expect(question.unit).toBe('buttons');
      expect(question.explanation).toContain(`There are ${blue} blue buttons.`);
      const parts = factor + factor + 1;
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${total} − ${extra} = ${total - extra}`,
        `${factor} + ${factor} + 1 = ${parts} parts`,
        `${total - extra} ÷ ${parts} = ${blue / factor}`,
        `${blue / factor} × ${factor} = ${blue}`,
      ]);
    }
  }
  expect([...factors].sort()).toEqual([2, 4]);
});

it('repeats a seeded question and varies the visible clues across practice indices', () => {
  expect(makeRagQuestion(83)).toEqual(makeRagQuestion(83, 0));
  const clues = Array.from({ length: 12 }, (_, index) =>
    makeRagQuestion(83, index).context?.join(' '),
  );
  expect(new Set(clues).size).toBeGreaterThan(1);
});
