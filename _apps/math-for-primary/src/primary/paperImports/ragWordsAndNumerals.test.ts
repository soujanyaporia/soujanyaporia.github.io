import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragWordsAndNumerals';

// Independent reader: interpret the visible words using a running subtotal.
// No generation helpers, proof, worked steps or stored answer are used to solve.
const vocabulary: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
  fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function readVisibleName(q: Pick<Question, 'display'>): number {
  if (!q.display || /\d/.test(q.display)) throw new Error('Expected a visible number name');
  let total = 0;
  let subtotal = 0;
  const words = q.display.toLowerCase().replace(/[-,]/g, ' ').split(/\s+/).filter(Boolean);
  for (const word of words) {
    if (word === 'and') continue;
    if (word === 'hundred') subtotal *= 100;
    else if (word === 'thousand' || word === 'million') {
      total += subtotal * (word === 'million' ? 1000000 : 1000);
      subtotal = 0;
    } else {
      if (!Object.prototype.hasOwnProperty.call(vocabulary, word)) throw new Error(`Unknown number word: ${word}`);
      subtotal += vocabulary[word];
    }
  }
  return total + subtotal;
}

function numeral(text: string): number {
  if (!/^\d+$/.test(text) && !/^\d{1,3}(?:,\d{3})+$/.test(text)) throw new Error(`Invalid numeral: ${text}`);
  return Number(text.replace(/,/g, ''));
}

const seeds = [0, 1, 2, 7, 19, 53, 127, 911, 2026, -17, 2147483647, 4294967295];

describe('words to numerals', () => {
  it('anchors the independent reader with manually solved number names', () => {
    const examples: [string, number][] = [
      ['two million, forty-seven thousand and six', 2047006],
      ['eight million, three hundred and five thousand and sixty', 8305060],
      ['four million and nine', 4000009],
      ['seven million, six hundred thousand', 7600000],
      ['three million, twenty thousand, four hundred and twelve', 3020412],
      ['ten million', 10000000],
    ];
    for (const [display, expected] of examples) expect(readVisibleName({display})).toBe(expected);
  });

  it('solves visible givens across seeds and indices and checks both response forms', () => {
    const forms = new Set<string>();
    const values = new Set<number>();
    const zeroCases = new Set<string>();
    const correctPositions = new Set<number>();
    for (const seed of seeds) {
      for (let index = 0; index < 64; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = readVisibleName(q);
        const text = String(expected);
        values.add(expected);
        expect(Number.isSafeInteger(expected)).toBe(true);
        expect(expected).toBeGreaterThanOrEqual(1000000);
        expect(expected).toBeLessThan(10000000);
        expect(text).toHaveLength(7);
        expect(text).toContain('0');
        expect(numeral(q.answer)).toBe(expected);
        expect(correctAnswer(q, String(expected))).toBe(true);
        expect(correctAnswer(q, String(expected + 1))).toBe(false);
        expect(q.unit).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answerFormat).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);

        const middle = text.slice(1, 4);
        const last = text.slice(4);
        if (middle === '000') zeroCases.add('missing thousands');
        if (last === '000') zeroCases.add('missing last group');
        if (middle[0] === '0' && middle !== '000') zeroCases.add('leading group zero');
        if (middle[0] !== '0' && middle[1] === '0' && middle[2] !== '0') zeroCases.add('internal group zero');
        if (/^00[1-9]$/.test(last)) zeroCases.add('single digit last group');
        if (/^0[1-9]0$/.test(last)) zeroCases.add('tens only last group');

        if (q.choices) {
          forms.add('choice');
          expect(q.choices).toHaveLength(4);
          const choices = q.choices.map(numeral);
          expect(new Set(choices).size).toBe(4);
          expect(choices.filter(n => n === expected)).toHaveLength(1);
          expect(q.choices).toContain(q.answer);
          correctPositions.add(choices.indexOf(expected));
          for (const choice of q.choices) {
            expect(numeral(choice)).toBeGreaterThan(0);
            expect(numeral(choice)).toBeLessThanOrEqual(10000000);
            expect(correctAnswer(q, choice)).toBe(numeral(choice) === expected);
          }
        } else {
          forms.add('entry');
          expect(q.answer).toMatch(/^\d{7}$/);
        }
      }
    }
    expect([...forms].sort()).toEqual(['choice', 'entry']);
    expect(values.size).toBeGreaterThan(100);
    expect(zeroCases.size).toBe(6);
    expect(correctPositions.size).toBe(4);
  });

  it('checks worked group placement and addition against the independently read name', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 12; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = readVisibleName(q);
        const steps = q.workedSteps;
        if (!steps || steps.length !== 3) throw new Error('Expected three worked steps');
        const grouping = /^(\d) \| (\d{3}) \| (\d{3})$/.exec(steps[1].equation ?? '');
        if (!grouping) throw new Error('Missing padded place-value groups');
        expect(Number(grouping.slice(1).join(''))).toBe(expected);
        const sum = (steps[2].equation ?? '').replace(/,/g, '').match(/^(\d+) \+ (\d+) \+ (\d+) = (\d+)$/);
        if (!sum) throw new Error('Missing addition of group values');
        const [a, b, c, result] = sum.slice(1).map(Number);
        expect(a + b + c).toBe(expected);
        expect(result).toBe(expected);
        expect(a).toBe(Number(grouping[1]) * 1000000);
        expect(b).toBe(Number(grouping[2]) * 1000);
        expect(c).toBe(Number(grouping[3]));
      }
    }
  });

  it('is deterministic and declares the intended curriculum mapping', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('words-and-numerals');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.WN.01']);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of seeds) {
      const keys = new Set<string>();
      for (let index = 0; index < 8; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        keys.add(first.key);
      }
      expect(keys.size).toBe(8);
    }
  });
});
