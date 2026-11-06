import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2TwoTypeCount';

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given for ${pattern}`);
  return Number(match[1]);
}

it('finds the unique blue-card count by trying every split of the visible cards', () => {
  const differences = new Set<number>();
  const stories = new Set<string>();
  for (let seed = -12; seed < 52; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = q.context?.join(' ') ?? '';
      const cards = readCount(text, /Lina has (\d+) cards/);
      const blueDots = readCount(text, /Each blue card has (\d+) dots/);
      const goldDots = readCount(text, /Each gold card has (\d+) dots/);
      const dots = readCount(text, /There are (\d+) dots on the cards altogether/);
      expect(text).toContain('Each card is either blue or gold.');
      expect(cards).toBeGreaterThanOrEqual(8);
      expect(cards).toBeLessThanOrEqual(10);
      expect([2, 3, 4, 5]).toContain(blueDots);
      expect([2, 3, 4, 5]).toContain(goldDots);

      const solutions: number[] = [];
      for (let blue = 0; blue <= cards; blue++) {
        const gold = cards - blue;
        if (blue * blueDots + gold * goldDots === dots) solutions.push(blue);
      }
      expect(solutions).toHaveLength(1);
      const [blue] = solutions;
      expect(blue).toBeGreaterThan(0);
      expect(blue).toBeLessThan(cards);
      expect(q.prompt).toBe('How many blue cards does Lina have?');
      expect(q.unit).toBe('blue cards');
      expect(q.answer).toBe(String(blue));
      expect(q.choices).toBeUndefined();

      const allGold = cards * goldDots;
      const extra = allGold - dots;
      const difference = goldDots - blueDots;
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${cards} × ${goldDots} = ${allGold}`,
        `${allGold} − ${dots} = ${extra}`,
        `${goldDots} − ${blueDots} = ${difference}`,
        `${extra} ÷ ${difference} = ${blue}`,
      ]);
      differences.add(difference);
      stories.add(text);
    }
  }
  expect(differences).toEqual(new Set([1, 2]));
  expect(stories.size).toBeGreaterThan(12);
});

it('reproduces each question and varies the visible givens across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    contexts.add(q.context?.join(' ') ?? '');
  }
  expect(contexts.size).toBeGreaterThan(1);
});
