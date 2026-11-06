import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragLinkedComparisons';

function read(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible clue matching ${pattern} in ${text}`);
  return match;
}

// Try possible counts for one share. Keep only assignments that satisfy all three printed clues.
function solve(question: Pick<Question, 'context' | 'prompt'>) {
  const text = question.context?.join(' ') ?? '';
  const [, knownTin, knownCount] = read(text, /The (red|blue|green) tin holds (\d+) buttons\./);
  const [, fewerTin, difference, moreTin] = read(text, /The (red|blue|green) tin has (\d+) fewer buttons than the (red|blue|green) tin\./);
  const [, multiplier, largerTin, shareTin] = read(text, /There are (\d+) times as many buttons in the (red|blue|green) tin as in the (red|blue|green) tin\./);
  const gap = Number(difference);
  const factor = Number(multiplier);
  expect(gap).toBeGreaterThan(0);
  expect(factor).toBeGreaterThanOrEqual(2);
  expect(factor).toBeLessThanOrEqual(9);
  const solutions: Record<string, number>[] = [];
  for (let share = 1; share <= 999; share++) {
    const counts: Record<string, number> = { [shareTin]: share, [largerTin]: share * factor };
    if (counts[moreTin] === undefined) counts[moreTin] = counts[fewerTin] + gap;
    if (counts[fewerTin] === undefined) counts[fewerTin] = counts[moreTin] - gap;
    if (counts[knownTin] === Number(knownCount) && counts[moreTin] - counts[fewerTin] === gap && counts[fewerTin] > 0) solutions.push(counts);
  }
  expect(solutions).toHaveLength(1);
  const counts = solutions[0];
  const target = question.prompt === 'How many buttons are in the three tins altogether?'
    ? 'total' : read(question.prompt, /^How many buttons are in the (red|blue|green) tin\?$/)[1];
  const total = counts.red + counts.blue + counts.green;
  expect(total).toBeLessThan(10000);
  if (knownTin === largerTin) expect(Number(knownCount)).toBeLessThanOrEqual(999);
  return { counts, gap, factor, target, expected: target === 'total' ? total : counts[target], form: `${knownTin}/${largerTin}/${target}` };
}

it('solves every form from its visible clues and checks the work and response format', () => {
  const forms = ['red/green/green', 'red/green/total', 'green/green/red', 'red/red/total'];
  for (let seed = -8; seed < 24; seed++) {
    const seen = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { counts: { red, blue, green }, gap, factor, target, expected, form } = solve(q);
      seen.add(form);
      expect(q.answer).toBe(String(expected));
      expect(q.unit).toBe('buttons');
      expect(q.picture).toBeUndefined();
      const equations = form === 'green/green/red'
        ? [`${green} ÷ ${factor} = ${blue}`, `${blue} − ${gap} = ${red}`]
        : [`${red} + ${gap} = ${blue}`, form === 'red/red/total' ? `${red} ÷ ${factor} = ${green}` : `${blue} × ${factor} = ${green}`];
      if (target === 'total') equations.push(`${red} + ${blue} + ${green} = ${expected}`);
      expect(q.workedSteps?.map(step => step.equation)).toEqual(equations);
      if (form === 'red/red/total') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(expected));
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
    expect(seen).toEqual(new Set(forms));
  }
});

it('reproduces each question and varies the printed givens within each form', () => {
  const givens = new Map<string, Set<string>>();
  for (let seed = 20; seed < 44; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { form } = solve(q);
      const seen = givens.get(form) ?? new Set<string>();
      seen.add(JSON.stringify(q.context));
      givens.set(form, seen);
    }
  }
  expect(givens.size).toBe(4);
  for (const seen of givens.values()) expect(seen.size).toBeGreaterThan(8);
});
