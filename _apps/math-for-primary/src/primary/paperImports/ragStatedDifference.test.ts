import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragStatedDifference';

function read(line: string, pattern: RegExp): number[] {
  const match = pattern.exec(line);
  if (!match) throw new Error(`Cannot solve this line: ${line}`);
  return match.slice(1).map(Number);
}

it('solves each response from the visible counts, comparison direction and target', () => {
  const forms = new Set<string>();
  const stories = new Set<string>();
  let sawExcessAboveReference = false;
  for (let seed = -12; seed <= 36; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const [first = '', second = ''] = q.context ?? [];
      if (first.startsWith('(a)')) {
        const [steps, start] = read(first, /^\(a\) Which number is (\d+) more than (\d+)\?$/);
        const [low, high] = read(second, /^\(b\) How much less is (\d+) than (\d+)\?$/);
        const end = start + steps;
        const distance = high - low;
        expect(start).toBeGreaterThan(0);
        expect(low).toBeGreaterThan(0);
        expect(Math.max(end, high)).toBeLessThanOrEqual(100);
        expect(Math.floor(end / 10)).toBeGreaterThan(Math.floor(start / 10));
        expect(Math.floor(high / 10)).toBeGreaterThan(Math.floor(low / 10));
        const pair = JSON.stringify([String(end), String(distance)]);
        expect(q.structuredResponse?.kind).toBe('number-pair');
        expect(q.answer).toBe(pair);
        expect(correctAnswer(q, pair)).toBe(true);
        expect(correctAnswer(q, JSON.stringify([String(end), String(high)]))).toBe(false);
        forms.add('two blanks');
        continue;
      }
      const fans = first.startsWith('Mei folded');
      const [known] = read(first, fans ? /^Mei folded (\d+) paper fans\.$/ : /^A jar holds (\d+) white buttons\.$/);
      const [extra] = read(second, fans ? /^Ravi folded (\d+) more paper fans than Mei\.$/ : /^There are (\d+) more brown buttons than white buttons in the jar\.$/);
      expect(q.prompt).toContain(fans ? 'How many paper fans did Ravi fold?' : 'How many brown buttons are in the jar?');
      const total = known + extra;
      expect(known).toBeGreaterThan(0);
      expect(extra).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(20);
      sawExcessAboveReference ||= extra > known;
      stories.add(`${known}:${extra}`);
      if (q.prompt.includes('number sentence')) {
        const equation = `${known} + ${extra} = ${total}`;
        expect(q.answer).toBe(equation);
        expect(q.numberSentence?.chooseOperation).toBe(true);
        expect(correctAnswer(q, equation)).toBe(true);
        expect(correctAnswer(q, `${extra} + ${known} = ${total}`)).toBe(true);
        expect(correctAnswer(q, `${known} - ${extra} = ${Math.abs(known - extra)}`)).toBe(false);
        expect(correctAnswer(q, `0 + ${total} = ${total}`)).toBe(false);
        expect(correctAnswer(q, String(total))).toBe(false);
        forms.add(fans ? 'fans equation' : 'buttons equation');
      } else {
        expect(fans).toBe(true);
        expect(q.unit).toBe('paper fans');
        expect(q.answer).toBe(String(total));
        expect(correctAnswer(q, String(total))).toBe(true);
        expect(correctAnswer(q, String(extra))).toBe(false);
        forms.add('fans count');
      }
    }
  }
  expect(forms.size).toBe(4);
  expect(stories.size).toBeGreaterThan(8);
  expect(sawExcessAboveReference).toBe(true);
});

it('keeps the equation and final count for the same story together and reproducible', () => {
  for (let seed = 0; seed < 16; seed++) {
    for (const start of [0, 4]) {
      const round = Array.from({ length: 4 }, (_, i) => makeRagQuestion(seed, start + i));
      const at = round.findIndex(q => q.context?.[0]?.startsWith('Mei folded') && q.numberSentence !== undefined);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at).toBeLessThan(3);
      const equation = round[at], count = round[at + 1];
      expect(count.unit).toBe('paper fans');
      expect(count.context).toEqual(equation.context);
      expect(count.key).not.toBe(equation.key);
      expect(makeRagQuestion(seed, start + at)).toEqual(equation);
      expect(makeRagQuestion(seed, start + at + 1)).toEqual(count);
    }
  }
});
