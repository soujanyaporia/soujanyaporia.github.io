import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragCoinCountValueDifference';

// The solver receives only pupil-visible text, never answers or generation state.
type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

function solveVisible(q: VisibleQuestion) {
  const text = (q.context ?? []).join('\n');
  const denominations = /only (\d+)-cent coins and (\d+)-cent coins in a purse\./.exec(text);
  const counts = /For every (\d+)-cent coin, there are (\d+) (\d+)-cent coins\./.exec(text);
  const values = /The (\d+)-cent coins are worth \$(\d+)\.(\d{2}) more altogether than the (\d+)-cent coins\./.exec(text);
  if (!denominations || !counts || !values) throw new Error('Missing visible coin givens');

  const small = Number(denominations[1]);
  const large = Number(denominations[2]);
  const multiple = Number(counts[2]);
  const differenceCents = Number(values[2]) * 100 + Number(values[3]);
  if (!(small > 0 && large > small && multiple > 1 && differenceCents > 0)) {
    throw new Error('Invalid visible quantities');
  }
  if (Number(counts[1]) !== large || Number(counts[3]) !== small ||
      Number(values[1]) !== small || Number(values[4]) !== large) {
    throw new Error('Inconsistent coin denominations');
  }
  if (!q.prompt.includes(`How many more ${small}-cent coins than ${large}-cent coins`) ||
      !q.prompt.includes('total value of all the coins, in dollars')) {
    throw new Error('Both linked response tasks must be visible');
  }

  // Enumerate possible counts and check the stated value difference directly.
  // A positive integral difference contributes at least one cent per group,
  // so differenceCents is a sufficient upper bound for the larger-coin count.
  const solutions: {smallCount: number; largeCount: number; extraCoins: number; totalCents: number}[] = [];
  for (let largeCount = 1; largeCount <= differenceCents; largeCount++) {
    const smallCount = multiple * largeCount;
    const smallTotal = smallCount * small;
    const largeTotal = largeCount * large;
    if (smallTotal - largeTotal === differenceCents) {
      solutions.push({smallCount, largeCount, extraCoins: smallCount - largeCount, totalCents: smallTotal + largeTotal});
    }
  }
  if (solutions.length !== 1) throw new Error(`Expected one solution, found ${solutions.length}`);
  return {solution: solutions[0]!, multiple, differenceCents};
}

function expectedFields(visible: VisibleQuestion): string[] {
  const {solution} = solveVisible(visible);
  return [String(solution.extraCoins), (solution.totalCents / 100).toFixed(2)];
}

function responseSpec(q: Question) {
  if (!q.structuredResponse) throw new Error('Missing response fields');
  return q.structuredResponse;
}

describe('coin count multiple and value difference', () => {
  it('independently solves a visible example with different denominations', () => {
    const visible: VisibleQuestion = {
      context: [
        'Zara has only 10-cent coins and 50-cent coins in a purse.',
        'For every 50-cent coin, there are 6 10-cent coins.',
        'The 10-cent coins are worth $2.30 more altogether than the 50-cent coins.',
      ],
      prompt: '(a) How many more 10-cent coins than 50-cent coins are in the purse? (b) What is the total value of all the coins, in dollars?',
    };
    expect(solveVisible(visible).solution).toEqual({
      smallCount: 138, largeCount: 23, extraCoins: 115, totalCents: 2530,
    });
    expect(expectedFields(visible)).toEqual(['115', '25.30']);
    expect(() => solveVisible({
      ...visible,
      context: visible.context!.map(line => line.replace('$2.30', '$2.31')),
    })).toThrow('Expected one solution');
  });

  it('solves both answers from visible givens across varied seeds and indices', () => {
    const seeds = [-2147483648, -37, -1, 0, 1, 17, 2147483647,
      ...Array.from({length: 96}, (_, i) => i + 100)];
    for (const seed of seeds) {
      for (const index of [0, 1, 7]) {
        const q = makeRagQuestion(seed, index);
        const visible = {context: q.context, prompt: q.prompt};
        const {solution, multiple, differenceCents} = solveVisible(visible);
        const expected = expectedFields(visible);
        expect(JSON.parse(q.answer)).toEqual(expected);
        expect(structuredResponseCorrect(responseSpec(q), q.answer, JSON.stringify(expected))).toBe(true);
        expect(Number.isSafeInteger(solution.smallCount)).toBe(true);
        expect(Number.isSafeInteger(solution.largeCount)).toBe(true);
        expect(solution.largeCount).toBeGreaterThan(0);
        expect(solution.smallCount).toBeGreaterThan(solution.largeCount);
        expect(solution.smallCount).toBeLessThan(400);
        expect(solution.totalCents).toBeLessThan(12000);
        expect(multiple).not.toBe(4);
        expect(differenceCents).not.toBe(1140);
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps!.every(step => step.text.length > 0 && Boolean(step.equation))).toBe(true);
        expect(q.explanation).toContain(`$${expected[1]}`);
      }
    }
  });

  it('keeps the count integral and checks each linked answer separately', () => {
    const q = makeRagQuestion(29, 2);
    const spec = responseSpec(q);
    const [count, dollars] = expectedFields({context: q.context, prompt: q.prompt});
    const totalCents = solveVisible({context: q.context, prompt: q.prompt}).solution.totalCents;
    expect(spec).toEqual({
      kind: 'number-fields',
      fields: [
        {label: '(a) Extra 20-cent coins (coins)'},
        {label: '(b) Total value ($)', decimal: true},
      ],
    });
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([count, String(Number(dollars))]))).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(Number(count) + 1), dollars]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([count, ((totalCents + 1) / 100).toFixed(2)]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([count, String(totalCents)]))).toBe(false);
    expect(structuredResponseReady(spec, JSON.stringify([`${count}.5`, dollars]))).toBe(false);
    expect(structuredResponseReady(spec, JSON.stringify(['', dollars]))).toBe(false);
    expect(structuredResponseReady(spec, JSON.stringify([count]))).toBe(false);
    expect(structuredResponseReady(spec, JSON.stringify([count, dollars, '0']))).toBe(false);
  });

  it('is repeatable and produces varied visible questions', () => {
    const contexts = new Set<string>();
    const multiples = new Set<number>();
    for (let seed = 0; seed < 128; seed++) {
      const q = makeRagQuestion(seed, 3);
      expect(makeRagQuestion(seed, 3)).toEqual(q);
      contexts.add(JSON.stringify(q.context));
      multiples.add(solveVisible({context: q.context, prompt: q.prompt}).multiple);
    }
    expect(contexts.size).toBeGreaterThan(40);
    expect(multiples.size).toBe(3);
    expect(makeRagQuestion(9)).toEqual(makeRagQuestion(9, 0));
    expect(makeRagQuestion(9, 0).key).not.toBe(makeRagQuestion(9, 1).key);
  });
});
