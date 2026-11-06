import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragNumeralsAndNumberNames';

// Enumerate names in counting order so a name's index is its numeral.
function referenceNames(): string[] {
  const units = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const belowHundred = [...units, 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  for (const decade of ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']) {
    belowHundred.push(...units.map(unit => unit ? `${decade}-${unit}` : decade));
  }
  const belowThousand = [...belowHundred];
  for (const digit of units.slice(1)) {
    belowThousand.push(...belowHundred.map(end => end ? `${digit} hundred and ${end}` : `${digit} hundred`));
  }
  const names = [...belowThousand];
  for (const digit of units.slice(1)) {
    for (const [remainder, end] of belowThousand.entries()) {
      const prefix = `${digit} thousand`;
      if (remainder === 0) names.push(prefix);
      else names.push(prefix + (remainder < 100 ? ' and ' : ' ') + end);
    }
  }
  return names;
}

const names = referenceNames();

test('solves the printed name or list and checks the requested answer form', () => {
  const middlePlaces = new Set<string>();
  for (const seed of [-17, 0, 1, 8, 42, 73, 105, 2026]) {
    let comparisons = 0;
    for (let index = 0; index < 28; index++) {
      const question = makeRagQuestion(seed, index);
      const given = question.context?.[0] ?? '';
      expect(question.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      if (/^\d/.test(given)) {
        comparisons++;
        expect(given).toMatch(/^\d{4}(, \d{4}){3}$/);
        const numerals = given.split(', ');
        expect(new Set(numerals).size).toBe(4);
        expect(new Set(numerals.map(n => n[0])).size).toBe(1);
        const greatest = Math.max(...numerals.map(Number));
        const expected = names[greatest];
        expect(question.prompt).toMatch(/greatest.*in words/i);
        expect(question.answerFormat).toBe('number-words');
        expect(question.answer).toBe(expected);
        expect(correctAnswer(question, expected)).toBe(true);
        expect(correctAnswer(question, String(greatest))).toBe(false);
        const smaller = numerals.find(n => Number(n) < greatest)!;
        expect(correctAnswer(question, names[Number(smaller)])).toBe(false);
      } else {
        const expected = String(names.indexOf(given));
        expect(expected).toMatch(/^[1-9]\d0[1-9]$/);
        middlePlaces.add(expected[1] === '0' ? 'both zero' : 'tens zero');
        expect(question.prompt).toMatch(/digits/i);
        expect(question.answerFormat).toBeUndefined();
        expect(question.answer).toBe(expected);
        expect(correctAnswer(question, expected)).toBe(true);
        expect(correctAnswer(question, expected.replace(/0/g, ''))).toBe(false);
        expect(correctAnswer(question, given)).toBe(false);
      }
    }
    expect(comparisons).toBe(2);
  }
  expect(middlePlaces).toEqual(new Set(['both zero', 'tens zero']));
});

test('replays the same question and varies the visible givens across indices', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 28; index++) {
    const question = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(question);
    givens.add(question.context![0]);
  }
  expect(givens.size).toBeGreaterThan(8);
});
