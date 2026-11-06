import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4RegroupKnownProduct';

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given ${pattern}: ${text}`);
  return Number(match[1]);
}

it('solves each form from the pupil’s givens and checks the meaning of the answer', () => {
  const examples = new Map<string, Set<string>>();
  let needsCombinedStock = false;
  for (let seed = -8; seed <= 39; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join(' ');
      let dividend: number, divisor: number, form: string;
      let equations: string[];
      if (q.prompt.startsWith('What is the result of my second division?')) {
        form = 'increased';
        const oldDivisor = read(text, /starting number by (\d+)/);
        const oldQuotient = read(text, /get (\d+) with no remainder/);
        const addition = read(text, /add (\d+) to it/);
        divisor = read(text, /divide the result by (\d+)/);
        expect(oldDivisor).not.toBe(divisor);
        expect(addition).toBeGreaterThan(0);
        const startingNumber = oldQuotient * oldDivisor;
        dividend = startingNumber + addition;
        equations = [`${oldQuotient} × ${oldDivisor} = ${startingNumber}`, `${startingNumber} + ${addition} = ${dividend}`, `${dividend} ÷ ${divisor} = ${dividend / divisor}`];
        expect(q.unit).toBeUndefined();
      } else {
        const boxes = read(text, /has (\d+) boxes of beads/);
        const perBox = read(text, /Each box holds (\d+) beads/);
        dividend = boxes * perBox;
        let unit: string;
        if (q.prompt.startsWith('How many tubes does the shop fill?')) {
          form = 'count';
          divisor = read(text, /with (\d+) beads in each tube/);
          unit = 'tubes';
          if (perBox % divisor !== 0) needsCombinedStock = true;
        } else {
          form = 'share';
          expect(q.prompt).toMatch(/^How many beads does each club get\?/);
          divisor = read(text, /to (\d+) clubs/);
          expect(text).toContain('Each club gets the same number');
          unit = 'beads';
        }
        expect(q.unit).toBe(unit);
        equations = [`${boxes} × ${perBox} = ${dividend} beads`, `${dividend} ÷ ${divisor} = ${dividend / divisor} ${unit}`];
      }
      expect(divisor).toBeGreaterThan(1);
      expect(divisor).toBeLessThan(10);
      expect(dividend).toBeGreaterThan(0);
      expect(dividend).toBeLessThan(10000);
      expect(dividend % divisor).toBe(0);
      expect(q.answer).toBe(String(dividend / divisor));
      expect(q.workedSteps?.map(step => step.equation)).toEqual(equations);
      if (!examples.has(form)) examples.set(form, new Set());
      examples.get(form)!.add(text);
    }
  }
  expect([...examples.keys()].sort()).toEqual(['count', 'increased', 'share']);
  for (const stems of examples.values()) expect(stems.size).toBeGreaterThan(8);
  expect(needsCombinedStock).toBe(true);
});

it('replays a question exactly and offers all three tasks over consecutive indices', () => {
  const questions = [4, 5, 6].map(index => makeRagQuestion(31, index));
  expect(makeRagQuestion(31, 5)).toEqual(questions[1]);
  expect(new Set(questions.map(q => q.prompt)).size).toBe(3);
});
