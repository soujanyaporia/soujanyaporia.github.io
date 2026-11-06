import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP2LinkedAdditiveComparisonsAndChanges';

type Visible = Pick<Question, 'context' | 'display' | 'prompt'>;
function numbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error('Missing clue: ' + text);
  return match.slice(1).map(Number);
}

// Try pupil entries against the two original relationships in the forward direction.
function read(q: Visible) {
  const clues = (q.context ?? []).join(' ');
  if (q.prompt === 'What number is on my card?') {
    const [added, extra, base] = numbers(clues, /^I add (\d+) to the number on my card\. My answer is (\d+) more than (\d+)\.$/);
    return { form: 'card', unit: undefined, values: [added, extra, base], middle: base + extra,
      fits: (n: number) => (n + added) - base === extra };
  }
  if (q.prompt === 'How many red buttons were on the tray at first?') {
    const [extra, taken, left] = numbers(clues, /^At first, a tray had (\d+) more red buttons than blue buttons\. Mei took (\d+) blue buttons off the tray\. This left (\d+) blue buttons\.$/);
    return { form: 'buttons', unit: 'buttons', values: [extra, taken, left], middle: left + taken,
      fits: (red: number) => (red - extra) - taken === left };
  }
  if (q.prompt !== 'Which number belongs in the box?') throw new Error('Unrecognised task: ' + q.prompt);
  const [gap, base] = numbers(clues, /^The two numbers add up to (\d+) less than (\d+)\.$/);
  const [shown] = numbers(q.display ?? '', /^(\d+) \+ □$/);
  return { form: 'box', unit: undefined, values: [gap, base, shown], middle: base - gap,
    fits: (n: number) => base - (shown + n) === gap };
}

it('gives one numerical answer consistent with both visible clues', () => {
  for (const seed of [-32, -1, 0, 1, 7, 19, 84, 351, 2026, 100003]) {
    const forms = new Set<string>();
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const task = read(q);
      forms.add(task.form);
      const solutions = Array.from({ length: 1000 }, (_, n) => n).filter(task.fits);
      expect(solutions).toHaveLength(1);
      const answer = solutions[0];
      expect(q.answer).toBe(String(answer));
      expect(q.unit).toBe(task.unit);
      expect(q.choices ?? q.structuredResponse ?? q.numberSentence).toBeUndefined();
      expect([...task.values, task.middle, answer].every(n => Number.isInteger(n) && n > 0 && n < 1000)).toBe(true);

      const equations = (q.workedSteps ?? []).map(step => step.equation ?? '');
      expect(equations).toHaveLength(2);
      const parseStep = (line: string) => {
        const m = /^(\d+) ([+−]) (\d+) = (\d+)$/.exec(line);
        if (!m) throw new Error('Unreadable worked step: ' + line);
        const a = Number(m[1]), b = Number(m[3]), result = Number(m[4]);
        expect(m[2] === '+' ? a + b : a - b).toBe(result);
        return { a, result };
      };
      expect(parseStep(equations[0]).result).toBe(task.middle);
      expect(parseStep(equations[1])).toEqual({ a: task.middle, result: answer });
    }
    expect([...forms].sort()).toEqual(['box', 'buttons', 'card']);
  }
});

it('reproduces a question and varies its numerical clues within each form', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = 0; seed < 16; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { form, values } = read(q);
      const group = seen.get(form) ?? new Set<string>();
      group.add(values.join(':'));
      seen.set(form, group);
    }
  }
  expect(seen.size).toBe(3);
  for (const group of seen.values()) expect(group.size).toBeGreaterThan(5);
});
