import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP4DecimalToEquivalentFraction';

test('solve each visible decimal and enforce the requested answer form', () => {
  for (let seed = -4; seed < 36; seed++) {
    for (let index = 0; index < 7; index++) {
      const q = makeRagQuestion(seed, index);
      const match = /^(\d+)\.(\d{2,3})(?: = (\d+)\/□)?$/.exec(q.display ?? '');
      if (!match) throw new Error(`Cannot read the given value: ${q.display}`);
      const [, wholeDigits, digits, suppliedTop] = match;
      const whole = Number(wholeDigits);
      const part = Number(digits);
      const scale = 10 ** digits.length;
      expect(part).toBeGreaterThan(0);
      expect(part).toBeLessThan(scale);

      let expected: string;
      if (suppliedTop !== undefined) {
        // Cross-multiply using only the two numbers printed in the equality.
        const denominator = Number(suppliedTop) * scale / (whole * scale + part);
        expect(Number.isInteger(denominator)).toBe(true);
        expect(denominator).toBeGreaterThan(0);
        expected = String(denominator);
        expect(correctAnswer(q, String(denominator + 1))).toBe(false);
      } else {
        // The first denominator that gives a whole numerator is the simplest one.
        let denominator = 1;
        while ((part * denominator) % scale !== 0) denominator++;
        const numerator = part * denominator / scale;
        const prefix = whole > 0 ? `${whole} ` : '';
        expected = `${prefix}${numerator}/${denominator}`;
        expect(denominator).toBeLessThan(scale);
        expect(correctAnswer(q, `${prefix}${part}/${scale}`)).toBe(false);
        expect(correctAnswer(q, `${wholeDigits}.${digits}`)).toBe(false);
        if (whole > 0) {
          expect(correctAnswer(q, `${whole * denominator + numerator}/${denominator}`)).toBe(false);
          expect(q.choices).toContain(`${whole} ${2 * numerator}/${2 * denominator}`);
        }
      }
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(choice => correctAnswer(q, choice))).toEqual([expected]);
      }
    }
  }
});

test('vary the givens while preserving the response modes in each seven-item cycle', () => {
  const displays = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    const counts = { entry: 0, fractionChoice: 0, mixedChoice: 0, denominator: 0 };
    for (let index = 0; index < 7; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const display = q.display ?? '';
      displays.add(display);
      if (display.includes('□')) {
        counts.denominator++;
        expect(q.choices).toBeUndefined();
      } else if (/^[1-9]/.test(display)) {
        counts.mixedChoice++;
        expect(q.choices).toHaveLength(4);
      } else if (q.choices) {
        counts.fractionChoice++;
        expect(display).toMatch(/^0\.\d{3}$/);
      } else {
        counts.entry++;
        expect(display).toMatch(/^0\.\d{2}$/);
      }
    }
    expect(counts).toEqual({ entry: 3, fractionChoice: 2, mixedChoice: 1, denominator: 1 });
  }
  expect(displays.size).toBeGreaterThan(24);
});
