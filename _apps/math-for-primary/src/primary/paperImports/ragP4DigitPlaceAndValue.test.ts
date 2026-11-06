import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4DigitPlaceAndValue';

const placeNames = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands'];
function readNumber(label: string): number {
  expect(label).toMatch(/^(?:[1-9]\d{0,2})(?:,\d{3})*$/);
  return Number(label.replaceAll(',', ''));
}

it('solves each question using the prompt, the displayed numbers and the choices', () => {
  const forms = new Set<string>();
  for (let seed = -8; seed < 24; seed++) {
    for (let index = 0; index < 9; index++) {
      const q = makeRagQuestion(seed, index);
      const digitMatch = /\bdigit ([1-9])\b/.exec(q.prompt);
      if (!digitMatch) throw new Error(`Missing target digit in ${q.prompt}`);
      const digit = digitMatch[1];
      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      let matches: string[];

      if (!q.display) {
        const valueClue = /worth ([\d,]+)\./.exec(q.prompt);
        const placeClue = /in the ([a-z ]+) place\./.exec(q.prompt);
        expect(Number(!!valueClue) + Number(!!placeClue)).toBe(1);
        forms.add(valueClue ? 'select by value' : 'select by place');
        matches = choices.filter(choice => {
          const numeral = String(readNumber(choice));
          expect(numeral).toMatch(/^[1-9]\d{3,4}$/);
          expect([...numeral].filter(d => d === digit)).toHaveLength(1);
          const position = [...numeral].reverse().indexOf(digit);
          if (valueClue) return Number(digit + '0'.repeat(position)) === readNumber(valueClue[1]);
          return placeNames[position] === placeClue?.[1];
        });
      } else {
        const [first, operator, second] = q.display.split(' ');
        let numeral = readNumber(first);
        if (operator === '−') {
          forms.add('difference');
          const smaller = readNumber(second);
          expect(smaller).toBeGreaterThanOrEqual(10000);
          expect(numeral).toBeLessThanOrEqual(99999);
          expect(numeral).toBeGreaterThan(smaller);
          expect(numeral % 100).toBeLessThan(smaller % 100);
          numeral -= smaller;
          expect(q.prompt).toMatch(/worth in the difference/);
        } else if (operator === '×') {
          forms.add('product');
          const factor = readNumber(second);
          expect(factor).toBeGreaterThanOrEqual(2);
          expect(factor).toBeLessThanOrEqual(9);
          expect(numeral).toBeLessThanOrEqual(9999);
          numeral *= factor;
          expect(q.prompt).toMatch(/place.*product/);
        } else {
          expect(operator).toBeUndefined();
          expect(q.prompt).toMatch(/place.*this number/);
          forms.add('given numeral');
        }
        expect(numeral).toBeGreaterThanOrEqual(1000);
        expect(numeral).toBeLessThan(100000);
        const columns = [...String(numeral)].reverse();
        expect(columns.filter(d => d === digit)).toHaveLength(1);
        const position = columns.indexOf(digit);
        if (operator === '−') {
          const expectedValue = Number(digit + '0'.repeat(position));
          matches = choices.filter(option => readNumber(option) === expectedValue);
        } else {
          expect(choices.every(option => placeNames.slice(0, columns.length).includes(option))).toBe(true);
          matches = choices.filter(option => option === placeNames[position]);
        }
        if (operator) expect(q.workedSteps?.[0].equation).toBe(`${q.display} = ${numeral.toLocaleString('en-SG')}`);
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
    }
  }
  expect(forms).toEqual(new Set(['select by value', 'select by place', 'difference', 'product', 'given numeral']));
});

it('reproduces a seed and index and includes all four tasks in nine consecutive slots', () => {
  for (const seed of [0, 91, 703]) {
    const questions = Array.from({ length: 9 }, (_, i) => makeRagQuestion(seed, i + 4));
    expect(questions).toEqual(Array.from({ length: 9 }, (_, i) => makeRagQuestion(seed, i + 4)));
    expect(questions.filter(q => !q.display)).toHaveLength(6);
    expect(questions.filter(q => q.display?.includes('−'))).toHaveLength(1);
    expect(questions.filter(q => q.display?.includes('×'))).toHaveLength(1);
    expect(questions.filter(q => q.display && !q.display.includes(' '))).toHaveLength(1);
  }
});
