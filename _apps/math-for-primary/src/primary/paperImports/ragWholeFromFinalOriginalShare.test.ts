import {describe, expect, it} from 'vitest';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragWholeFromFinalOriginalShare';

type Solution = {
  kind: 'sales' | 'money' | 'stars';
  expected: string;
  whole: number;
  amounts: number[];
};

function readFraction(text: string): [number, number] {
  const match = /(\d+)\/(\d+)/.exec(text);
  if (!match) throw new Error(`Missing visible fraction: ${text}`);
  const n = Number(match[1]);
  const d = Number(match[2]);
  if (!(n > 0 && n < d && d <= 12)) throw new Error('Invalid visible proper fraction');
  return [n, d];
}

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible amount: ${text}`);
  const value = Number(match[1]);
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Invalid visible amount');
  return value;
}

// Deliberately reduce counted quantities, rather than use the generator's fraction helpers.
function simplest(top: number, bottom: number): [string, string] {
  for (let divisor = Math.min(top, bottom); divisor >= 1; divisor--) {
    if (top % divisor === 0 && bottom % divisor === 0) {
      return [String(top / divisor), String(bottom / divisor)];
    }
  }
  throw new Error('Cannot simplify the counted fraction');
}

function only(matches: Solution[]): Solution {
  if (matches.length !== 1) throw new Error(`Expected one solution; found ${matches.length}`);
  return matches[0]!;
}

/**
 * Receives only pupil-visible text. It tries possible starting quantities and
 * performs the transactions forwards; it never reads answers, steps, keys,
 * generation tables or private generation parameters.
 */
function solveVisible(context: string[], prompt: string): Solution {
  if (context.length !== 3) throw new Error('Expected three complete context lines');
  const [first, second, last] = context as [string, string, string];
  const matches: Solution[] = [];

  if (first.includes('notebooks') && prompt.includes('sell')) {
    const fixed = readCount(first, /sold (\d+) notebooks before lunch/);
    const [n, d] = readFraction(second);
    const [p, q] = readFraction(last);
    // A positive coefficient ensures that the final-share equation has at most one real solution.
    if ((d - n) * q <= p * d) throw new Error('No positive uniquely determined starting stock');
    for (let whole = 1; whole <= 5000; whole++) {
      if (whole <= fixed) continue;
      const afterFirst = whole - fixed;
      if (afterFirst * n % d !== 0) continue;
      const laterSale = afterFirst * n / d;
      const left = afterFirst - laterSale;
      if (left > 0 && left * q === whole * p) {
        matches.push({
          kind: 'sales',
          expected: String(fixed + laterSale),
          whole,
          amounts: [fixed, afterFirst, laterSale, left],
        });
      }
    }
    return only(matches);
  }

  if (first.includes('art project') && prompt.includes('starting amount')) {
    const [a, b] = readFraction(first);
    const [c, d] = readFraction(second);
    const [p, q] = readFraction(last);
    const fixed = readCount(last, /paid \$(\d+) for a storage box/);
    if ((b - a) * (d - c) * q <= p * b * d) {
      throw new Error('The fixed payment must account for a positive share');
    }
    for (let whole = 1; whole <= 5000; whole++) {
      if (whole * a % b !== 0) continue;
      const tools = whole * a / b;
      const afterTools = whole - tools;
      if (afterTools * c % d !== 0) continue;
      const paper = afterTools * c / d;
      const beforeBox = afterTools - paper;
      const left = beforeBox - fixed;
      if (left > 0 && left * q === whole * p) {
        const [numerator, denominator] = simplest(paper, whole);
        matches.push({
          kind: 'money',
          expected: JSON.stringify([numerator, denominator, whole.toFixed(2)]),
          whole,
          amounts: [tools, afterTools, paper, beforeBox, fixed, left],
        });
      }
    }
    return only(matches);
  }

  if (first.includes('paper stars') && prompt.includes('made in all')) {
    const [a, b] = readFraction(first);
    const [c, d] = readFraction(second);
    const added = readCount(last, /made (\d+) more paper stars/);
    const excess = readCount(last, /had (\d+) more stars than/);
    if (added <= excess) throw new Error('The addition must also replace the gifts');
    for (let whole = 1; whole <= 5000; whole++) {
      if (whole * a % b !== 0) continue;
      const firstGift = whole * a / b;
      const afterFirst = whole - firstGift;
      if (afterFirst * c % d !== 0) continue;
      const secondGift = afterFirst * c / d;
      const beforeAddition = afterFirst - secondGift;
      const final = beforeAddition + added;
      if (beforeAddition > 0 && final === whole + excess) {
        const [numerator, denominator] = simplest(firstGift + secondGift, whole);
        matches.push({
          kind: 'stars',
          expected: JSON.stringify([numerator, denominator, String(whole + added)]),
          whole,
          amounts: [firstGift, afterFirst, secondGift, beforeAddition, added, excess, final],
        });
      }
    }
    return only(matches);
  }

  throw new Error('Unrecognised visible task');
}

describe('whole from final original share', () => {
  it('calibrates the forward solver on three independently specified visible stories', () => {
    const sales = solveVisible([
      'A stall started the day with some notebooks. It sold 24 notebooks before lunch.',
      'After lunch, it sold 1/3 of the notebooks still at the stall.',
      'At closing time, 2/5 of the starting number of notebooks remained.',
    ], 'How many notebooks did the stall sell that day?');
    expect(sales.whole).toBe(60);
    expect(sales.expected).toBe('36');

    const money = solveVisible([
      'Leena set aside some money for an art project. She spent 1/3 of it on tools.',
      'Next, she spent 1/4 of the money she had left on craft paper.',
      'She then paid $45 for a storage box. She had 1/4 of her starting money left.',
    ], 'Find the craft-paper fraction and her starting amount in dollars.');
    expect(money.whole).toBe(180);
    expect(money.expected).toBe(JSON.stringify(['1', '6', '180.00']));

    const stars = solveVisible([
      'Hana made some paper stars before a club meeting. She gave 2/5 of this batch to the first group.',
      'She gave 1/3 of the stars she had left to a second group.',
      'After the meeting, Hana made 126 more paper stars. She then had 18 more stars than she had made before the meeting.',
    ], 'Find the fraction given away and the number made in all that day.');
    expect(stars.whole).toBe(180);
    expect(stars.expected).toBe(JSON.stringify(['3', '5', '306']));
  });

  it('solves varied seeds from visible givens and checks both linked responses', () => {
    const signatures: Record<Solution['kind'], Set<string>> = {
      sales: new Set<string>(),
      money: new Set<string>(),
      stars: new Set<string>(),
    };
    const seeds = [-2147483648, ...Array.from({length: 161}, (_, i) => i - 40), 2147483647];
    expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));

    for (const seed of seeds) {
      for (const index of [0, 1, 2, 7]) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible(question.context ?? [], question.prompt);
        expect(question.answer).toBe(solution.expected);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        expect(solution.whole).toBeGreaterThan(0);
        expect(solution.whole).toBeLessThanOrEqual(1000);
        expect(solution.amounts.every(amount => Number.isSafeInteger(amount) && amount > 0)).toBe(true);
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(question.hint.trim().length).toBeGreaterThan(0);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
        expect(question.picture).toBeUndefined();
        expect(question.choices).toBeUndefined();
        signatures[solution.kind].add(JSON.stringify(question.context));

        if (solution.kind === 'sales') {
          expect(question.unit).toBe('notebooks');
          expect(question.structuredResponse).toBeUndefined();
          continue;
        }

        const spec = question.structuredResponse;
        if (!spec || spec.kind !== 'number-fields') throw new Error('Both linked parts need numeric fields');
        expect(spec.fields).toHaveLength(3);
        expect(spec.fields[0]!.label).toContain('(a)');
        expect(spec.fields[1]!.label).toContain('(a)');
        expect(spec.fields[2]!.label).toContain('(b)');
        expect(Boolean(spec.fields[2]!.decimal)).toBe(solution.kind === 'money');
        expect(structuredResponseCorrect(spec, question.answer, solution.expected)).toBe(true);

        const [n, d, total] = JSON.parse(solution.expected) as [string, string, string];
        const unreduced = JSON.stringify([String(Number(n) * 2), String(Number(d) * 2), total]);
        const wrongTotal = JSON.stringify([n, d, String(Number(total) + 1)]);
        const swappedFraction = JSON.stringify([d, n, total]);
        expect(structuredResponseCorrect(spec, question.answer, unreduced)).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, wrongTotal)).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, swappedFraction)).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([n, d]))).toBe(false);
      }
    }

    for (const kind of ['sales', 'money', 'stars'] as const) {
      expect(signatures[kind].size).toBeGreaterThan(12);
    }
  });
});
