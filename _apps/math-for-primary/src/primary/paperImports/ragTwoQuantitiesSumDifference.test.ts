import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragTwoQuantitiesSumDifference';

it('solves the printed givens and checks the requested response across seeds', () => {
  const cardGivens = new Set<string>();
  const jarGivens = new Set<string>();
  for (let seed = -12; seed < 36; seed++) {
    const formats = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = q.context?.join(' ') ?? '';
      expect(q.picture).toBeUndefined();
      if (q.prompt === 'How many buttons are in the green jar?') {
        const match = /^A blue jar and a green jar hold (\d+) buttons altogether\. The blue jar has (\d+) more buttons than the green jar\.$/.exec(text);
        if (!match) throw new Error(`Cannot read the jar counts from: ${text}`);
        const total = Number(match[1]);
        const extra = Number(match[2]);
        expect(extra).toBeGreaterThan(0);
        expect(total - extra).toBeLessThanOrEqual(999);
        // Enumerate possible green counts and check both jars against the story.
        const possible: number[] = [];
        for (let green = 1; green < total; green++) {
          const blue = total - green;
          if (blue - green === extra) possible.push(green);
        }
        expect(possible).toHaveLength(1);
        const green = possible[0];
        expect(q.answer).toBe(String(green));
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          `${total} − ${extra} = ${2 * green}`,
          `${2 * green} ÷ 2 = ${green}`,
        ]);
        expect(q.unit).toBe('buttons');
        expect(q.choices).toBeUndefined();
        jarGivens.add(text);
        formats.add('share entry');
      } else {
        expect(q.prompt).toBe('What do the two numbers add up to?');
        const match = /^One card shows (\d+)\. The number on the other card is (\d+) more than the number on the first card\.$/.exec(text);
        if (!match) throw new Error(`Cannot read the card comparison from: ${text}`);
        const first = Number(match[1]);
        const gap = Number(match[2]);
        expect(first).toBeGreaterThan(0);
        expect(gap).toBeGreaterThan(0);
        // Two copies of the first number account for everything except the gap.
        const sum = 2 * first + gap;
        const second = sum - first;
        expect(sum).toBeLessThanOrEqual(9999);
        expect(q.answer).toBe(String(sum));
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          `${first} + ${gap} = ${second}`,
          `${first} + ${second} = ${sum}`,
        ]);
        expect(q.unit).toBeUndefined();
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices.map(Number)).size).toBe(4);
          expect(q.choices.filter(value => Number(value) === sum)).toHaveLength(1);
          formats.add('total choice');
        } else {
          formats.add('total entry');
        }
        cardGivens.add(text);
      }
    }
    expect(formats).toEqual(new Set(['total entry', 'total choice', 'share entry']));
  }
  expect(cardGivens.size).toBeGreaterThan(20);
  expect(jarGivens.size).toBeGreaterThan(20);
});

it('reproduces each question from its seed and index', () => {
  for (const seed of [0, 7, 32, -19]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 1; index <= 8; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
