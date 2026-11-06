import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion} from './ragOrderWholeNumbers';

type Visible = Pick<Question, 'prompt' | 'order'>;

// Compare visible digit strings by place value, without numerical sorting.
function compareDigits(a: string, b: string): number {
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

// This solver receives only the prompt and the four visible number labels.
// Each number's rank is the count of numbers that must come before it.
function solveVisible(q: Visible) {
  const descending = q.prompt.includes('greatest to smallest');
  const ascending = q.prompt.includes('smallest to greatest');
  if (ascending === descending || !q.order || q.order.length !== 4) {
    throw new Error('Four numbers and one explicit direction are required.');
  }
  const labels = [...q.order];
  const digits = labels.map(value => value.replace(/\s+/g, ''));
  if (digits.some(value => !/^[1-9]\d*$/.test(value)) || new Set(digits).size !== 4) {
    throw new Error('The visible whole numbers must be distinct.');
  }
  const ordered = new Array<string>(4);
  for (let i = 0; i < digits.length; i++) {
    const rank = digits.filter(other => {
      const comparison = compareDigits(other, digits[i]);
      return descending ? comparison > 0 : comparison < 0;
    }).length;
    ordered[rank] = labels[i];
  }
  return {answer: ordered.join(','), ordered, labels, digits, descending};
}

function hasClosePair(digits: string[]): boolean {
  return digits.some((a, i) => digits.some((b, j) => {
    if (j <= i || a.length !== b.length) return false;
    const differences = [...a].flatMap((digit, place) => digit === b[place] ? [] : [place]);
    if (differences.length !== 2) return false;
    const [first, second] = differences;
    return second === first + 1 && a[first] === b[second] && a[second] === b[first];
  }));
}

const seeds = [-2147483648, -17, -1, ...Array.from({length: 64}, (_, i) => i), 99991, 2147483647];

describe('whole-number ordering candidate', () => {
  it('independently resolves close numbers and internal zeros in both directions', () => {
    const order = ['40 506', '40 560', '40 056', '40 065'];
    expect(solveVisible({prompt: 'Work from smallest to greatest.', order}).answer)
      .toBe('40 056,40 065,40 506,40 560');
    expect(solveVisible({prompt: 'Work from greatest to smallest.', order}).answer)
      .toBe('40 560,40 506,40 065,40 056');
  });

  it('solves visible givens across seeds and indices and checks range and comparison difficulty', () => {
    const directions = new Set<string>();
    const widths = new Set<number>();
    const visibleSets = new Set<string>();
    let includesZero = false;
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, order: q.order});
        expect(q.answer).toBe(solved.answer);
        expect(solved.labels).not.toEqual(solved.ordered);
        expect(solved.labels).not.toEqual([...solved.ordered].reverse());
        expect(hasClosePair(solved.digits)).toBe(true);
        expect(new Set(solved.digits.map(value => value.length)).size).toBe(1);
        for (const value of solved.digits) {
          const number = Number(value);
          expect(Number.isSafeInteger(number)).toBe(true);
          expect(number).toBeGreaterThanOrEqual(10000);
          expect(number).toBeLessThan(10000000);
          widths.add(value.length);
          includesZero ||= value.includes('0');
        }
        directions.add(solved.descending ? 'descending' : 'ascending');
        visibleSets.add([...solved.digits].sort().join(','));
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBeUndefined();
      }
    }
    expect([...directions].sort()).toEqual(['ascending', 'descending']);
    expect([...widths].sort()).toEqual([5, 6, 7]);
    expect(includesZero).toBe(true);
    expect(visibleSets.size).toBeGreaterThan(100);
  });

  it('accepts the independently derived sequence and rejects missing, repeated or misplaced numbers', () => {
    for (const seed of seeds.slice(0, 24)) {
      for (let index = 0; index < 2; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, order: q.order});
        expect(correctAnswer(q, solved.answer)).toBe(true);
        expect(correctAnswer(q, solved.ordered.slice(0, 3).join(','))).toBe(false);
        const repeated = [...solved.ordered];
        repeated[3] = repeated[2];
        expect(correctAnswer(q, repeated.join(','))).toBe(false);
        for (let i = 0; i < 3; i++) {
          const misplaced = [...solved.ordered];
          [misplaced[i], misplaced[i + 1]] = [misplaced[i + 1], misplaced[i]];
          expect(correctAnswer(q, misplaced.join(','))).toBe(false);
        }
      }
    }
  });

  it('gives mathematically correct adjacent comparisons and identifies their decisive places', () => {
    const names: Record<number, string> = {
      1: 'ones', 10: 'tens', 100: 'hundreds', 1000: 'thousands',
      10000: 'ten thousands', 100000: 'hundred thousands', 1000000: 'millions',
    };
    for (const seed of seeds.slice(0, 24)) {
      const q = makeRagQuestion(seed, 3);
      const solved = solveVisible({prompt: q.prompt, order: q.order});
      const steps = q.workedSteps ?? [];
      expect(steps).toHaveLength(4);
      for (let i = 0; i < 3; i++) {
        const a = Number(solved.ordered[i].replace(/\s+/g, ''));
        const b = Number(solved.ordered[i + 1].replace(/\s+/g, ''));
        let place = 1000000;
        while (Math.floor(a / place) % 10 === Math.floor(b / place) % 10) place /= 10;
        const leftDigit = Math.floor(a / place) % 10;
        const rightDigit = Math.floor(b / place) % 10;
        expect(solved.descending ? a > b : a < b).toBe(true);
        expect(steps[i].text).toContain(`${names[place]} place`);
        expect(steps[i].text).toContain(`${leftDigit} is ${solved.descending ? 'greater' : 'smaller'} than ${rightDigit}`);
        expect(steps[i].equation).toBe(`${solved.ordered[i]} ${solved.descending ? '>' : '<'} ${solved.ordered[i + 1]}`);
      }
      expect(steps[3].equation).toBe(solved.ordered.join(solved.descending ? ' > ' : ' < '));
    }
  });

  it('reproduces a seed and index without sharing mutable question arrays', () => {
    for (const seed of [-11, 0, 37, 99991]) {
      const original = makeRagQuestion(seed, 2);
      const clean = makeRagQuestion(seed, 2);
      expect(original).toEqual(clean);
      original.order!.reverse();
      original.workedSteps!.splice(0);
      expect(makeRagQuestion(seed, 2)).toEqual(clean);
      const variants = Array.from({length: 6}, (_, index) => makeRagQuestion(seed, index).order!.join(','));
      expect(new Set(variants).size).toBeGreaterThan(1);
    }
  });
});
