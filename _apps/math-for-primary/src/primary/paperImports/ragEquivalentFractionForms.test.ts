import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragEquivalentFractionForms';

type Fraction = [number, number];

function readFraction(text: string): Fraction {
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(text);
  if (!match) throw new Error(`Expected a written fraction, received ${text}`);
  const top = Number(match[1]);
  const bottom = Number(match[2]);
  expect(top).toBeLessThan(bottom);
  expect(bottom).toBeLessThanOrEqual(18);
  return [top, bottom];
}

function equalValue([a, b]: Fraction, [c, d]: Fraction): boolean {
  return a * d === b * c;
}

it('solves both choice tasks from the displayed fractions', () => {
  const modes = new Set<boolean>();
  const answerPositions = new Set<number>();
  for (let seed = -12; seed <= 60; seed++) {
    for (let index = 0; index < 5; index++) {
      const question = makeRagQuestion(seed, index);
      const matchBoth = question.prompt.includes('same value as both');
      if (!matchBoth) expect(question.prompt).toContain('different value');
      modes.add(matchBoth);

      const labels = (question.display ?? '').split(' and ');
      expect(labels).toHaveLength(matchBoth ? 2 : 1);
      expect(new Set(labels).size).toBe(labels.length);
      const references = labels.map(readFraction);
      expect(references.every(ref => equalValue(ref, references[0]))).toBe(true);
      const choices = question.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);

      const matches = choices.filter(label => {
        expect(labels).not.toContain(label);
        const choice = readFraction(label);
        return references.every(ref => equalValue(choice, ref));
      });
      expect(matches).toHaveLength(matchBoth ? 1 : 3);
      const solutions = matchBoth ? matches : choices.filter(label => !matches.includes(label));
      expect(solutions).toHaveLength(1);
      expect(question.answer).toBe(solutions[0]);
      answerPositions.add(choices.indexOf(solutions[0]));
    }
  }
  expect(modes.size).toBe(2);
  expect(answerPositions.size).toBe(4);
});

it('reproduces a question and varies the visible givens across indices', () => {
  const displays = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const question = makeRagQuestion(19, index);
    expect(makeRagQuestion(19, index)).toEqual(question);
    displays.add(question.display ?? '');
  }
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  expect(displays.size).toBeGreaterThan(3);
});
