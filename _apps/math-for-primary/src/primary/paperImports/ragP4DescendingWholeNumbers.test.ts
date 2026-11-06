import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4DescendingWholeNumbers';

function readRow(text: string): number[] {
  expect(text).toMatch(/^[1-9]\d \d{3}(?:, [1-9]\d \d{3}){2}$/);
  const values = text.split(', ').map(token => Number(token.replace(' ', '')));
  expect(new Set(values).size).toBe(3);
  return values;
}

it('solves both forms using only the displayed numbers and choices', () => {
  const forms = new Set<string>();
  const correctPositions = new Set<number>();
  for (let seed = -16; seed < 32; seed++) {
    for (const index of [0, 1, 4]) {
      const question = makeRagQuestion(seed, index);
      const choices = question.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const rows = choices.map(readRow);
      let matches: boolean[];
      if (question.display !== undefined) {
        forms.add('fixed set');
        const ordered = readRow(question.display).sort((a, b) => b - a);
        for (const row of rows) expect([...row].sort((a, b) => b - a)).toEqual(ordered);
        matches = rows.map(row => row.every((value, i) => value === ordered[i]));
      } else {
        forms.add('independent rows');
        expect(new Set(rows.flat()).size).toBe(12);
        matches = rows.map(([first, second, third]) => first > second && second > third);
      }
      expect(matches.filter(Boolean)).toHaveLength(1);
      const position = matches.indexOf(true);
      correctPositions.add(position);
      expect(question.answer).toBe(choices[position]);
      const labels = choices[position].split(', ');
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${labels[0]} > ${labels[1]}`, `${labels[1]} > ${labels[2]}`,
      ]);
    }
  }
  expect(forms.size).toBe(2);
  expect(correctPositions.size).toBe(4);
});

it('reproduces a question by seed and index and varies the visible givens across indices', () => {
  const questions = Array.from({ length: 12 }, (_, index) => makeRagQuestion(73, index));
  questions.forEach((question, index) => expect(makeRagQuestion(73, index)).toEqual(question));
  const givens = questions.map(question => question.display ?? question.choices?.join(' | '));
  expect(new Set(givens).size).toBeGreaterThan(1);
});
