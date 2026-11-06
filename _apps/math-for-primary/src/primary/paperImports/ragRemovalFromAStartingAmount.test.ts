import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRemovalFromAStartingAmount';

function pair(seed: number) {
  return [makeRagQuestion(seed, 2), makeRagQuestion(seed, 3)];
}

it('recovers the start from the two takers and the beads left, and grades the whole equation', () => {
  const stories = new Set<string>();
  for (let seed = -12; seed < 36; seed++) {
    const q = pair(seed).find(item => !item.picture);
    if (!q) throw new Error('Missing jar story');
    const story = q.context?.join(' ') ?? '';
    const givens = /^Lina took (\d+) beads from a jar\. Then Ben took (\d+) beads from the same jar\. (\d+) beads were still in the jar\.$/.exec(story);
    if (!givens) throw new Error(`Cannot read the three counts from: ${story}`);
    const [lina, ben, left] = givens.slice(1).map(Number);
    const taken = lina + ben;
    const start = taken + left;
    expect(Math.min(lina, ben, left)).toBeGreaterThan(0);
    expect(start).toBeLessThanOrEqual(100);
    expect(q.unit).toBe('beads');
    const equation = `${lina}+${ben}+${left}=${start}`;
    expect(q.answer).toBe(equation);
    expect(correctAnswer(q, equation)).toBe(true);
    expect(correctAnswer(q, `${lina}+${ben}-${left}=${start}`)).toBe(false);
    expect(correctAnswer(q, `${lina}+${left}=${lina + left}`)).toBe(false);
    expect(correctAnswer(q, `${lina}+${ben}+${left}=${start + 1}`)).toBe(false);
    expect(q.workedSteps?.map(step => step.equation)).toEqual([
      `${left} + ${ben} = ${start - lina}`,
      `${start - lina} + ${lina} = ${start}`,
      `${lina} + ${ben} + ${left} = ${start}`,
    ]);
    stories.add(story);
  }
  expect(stories.size).toBeGreaterThan(1);
});

it('finds exactly one matching calculation by counting the displayed pencils and crosses', () => {
  const pictures = new Set<string>();
  for (let seed = -12; seed < 36; seed++) {
    const q = pair(seed).find(item => item.picture);
    const picture = q?.picture;
    if (!q || picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing pencil picture');
    expect(picture.cards).toHaveLength(1);
    const { count, removed, icon } = picture.cards[0];
    if (count === undefined || removed === undefined) throw new Error('The card must show a collection and crosses');
    expect(icon).toBe('pencil');
    expect(removed).toBeGreaterThan(0);
    expect(removed).toBeLessThan(count);
    const expected = `${count} − ${removed}`;
    const choices = q.choices ?? [];
    expect(new Set(choices).size).toBe(4);
    const matches = choices.filter(choice => {
      const parts = /^(\d+) ([+−]) (\d+)$/.exec(choice);
      if (!parts) throw new Error(`Unreadable choice: ${choice}`);
      const a = Number(parts[1]);
      const b = Number(parts[3]);
      return (parts[2] === '+' ? a + b : a - b) === count - removed;
    });
    expect(matches).toEqual([expected]);
    expect(q.answer).toBe(expected);
    for (const choice of choices) expect(correctAnswer(q, choice)).toBe(choice === expected);
    pictures.add(`${count}/${removed}`);
  }
  expect(pictures.size).toBeGreaterThan(1);
});

it('repeats the same question for the same seed and index', () => {
  for (const seed of [-3, 0, 17, 91]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    expect(pair(seed)).toEqual(pair(seed));
  }
});
