import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragSuccessivePercentageFactors';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Kind = 'discount-tax' | 'reverse-remainders' | 'second-payment' | 'two-increases';
type Solution = {
  kind: Kind; first: number; second: number;
  startCents: number; middleCents: number; answerCents: number;
  wrongBaseAnswer?: number;
};

function capture(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  if (!match?.[1]) throw new Error(`Missing visible given: ${pattern}`);
  return match[1];
}

function readMoney(text: string, pattern: RegExp): number {
  const amount = capture(text, pattern);
  const [dollars, cents] = amount.split('.');
  return Number(dollars) * 100 + Number(cents);
}

function exactDivide(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator % denominator !== 0) {
    throw new Error('Visible givens require fractional cents or an invalid divisor');
  }
  return numerator / denominator;
}

// Receives only the displayed question. It cannot access answers, worked steps,
// seeds, generation helpers or private parameters. Forward cases use separate
// payments or interest additions; reverse cases undo the two payments in turn.
function solveVisible(visible: Visible): Solution {
  const text = (visible.context ?? []).join(' ');
  if (visible.prompt === 'What is the total price, including tax?') {
    const startCents = readMoney(text, /marked price of \$(\d+\.\d{2})/);
    const first = Number(capture(text, /a (\d+)% discount/));
    const second = Number(capture(text, /tax of (\d+)%/));
    const discount = exactDivide(startCents * first, 100);
    const middleCents = startCents - discount;
    const tax = exactDivide(middleCents * second, 100);
    return {kind: 'discount-tax', first, second, startCents, middleCents,
      answerCents: middleCents + tax,
      wrongBaseAnswer: middleCents + startCents * second / 100};
  }
  if (visible.prompt === 'How much gift money did Lina have at first?') {
    const first = Number(capture(text, /used (\d+)%/));
    const second = Number(capture(text, /donated (\d+)%/));
    const left = readMoney(text, /had \$(\d+\.\d{2}) left/);
    const middleCents = exactDivide(left * 100, 100 - second);
    const startCents = exactDivide(middleCents * 100, 100 - first);
    return {kind: 'reverse-remainders', first, second, startCents, middleCents,
      answerCents: startCents,
      wrongBaseAnswer: first + second < 100 ? left * 100 / (100 - first - second) : undefined};
  }
  if (visible.prompt === 'How much money did the club spend on food?') {
    const startCents = readMoney(text, /had \$(\d+\.\d{2}) for an outing/);
    const first = Number(capture(text, /spent (\d+)% of this money/));
    const second = Number(capture(text, /spent (\d+)% of the money left/));
    const transport = exactDivide(startCents * first, 100);
    const middleCents = startCents - transport;
    return {kind: 'second-payment', first, second, startCents, middleCents,
      answerCents: exactDivide(middleCents * second, 100),
      wrongBaseAnswer: startCents * second / 100};
  }
  if (visible.prompt === 'How much money was in the account after the second year?') {
    const startCents = readMoney(text, /put \$(\d+\.\d{2}) in a savings account/);
    const first = Number(capture(text, /first year, the bank added (\d+)%/));
    const second = Number(capture(text, /second year, the bank added (\d+)%/));
    const interestOne = exactDivide(startCents * first, 100);
    const middleCents = startCents + interestOne;
    const interestTwo = exactDivide(middleCents * second, 100);
    return {kind: 'two-increases', first, second, startCents, middleCents,
      answerCents: middleCents + interestTwo,
      wrongBaseAnswer: startCents + startCents * (first + second) / 100};
  }
  throw new Error(`Unrecognised visible question: ${visible.prompt}`);
}

const visibleOnly = (q: Question): Visible => ({prompt: q.prompt, context: q.context});

 describe('successive percentage factors candidate', () => {
  it('independently solves displayed givens across varied seeds and indices', () => {
    const seeds = [...Array.from({length: 128}, (_, i) => i - 64),
      2147483647, -2147483648, 4294967295];
    const contexts = new Map<Kind, Set<string>>();
    let reverseChoiceCount = 0;
    let reverseEntryCount = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        const expected = (solved.answerCents / 100).toFixed(2);
        expect(question.answer).toBe(expected);
        expect(question.unit).toBe('dollars');
        expect(question.picture).toBeUndefined();
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.explanation.length).toBeGreaterThan(40);
        for (const rate of [solved.first, solved.second]) {
          expect(Number.isInteger(rate)).toBe(true);
          expect(rate).toBeGreaterThan(0);
          expect(rate).toBeLessThan(100);
        }
        for (const cents of [solved.startCents, solved.middleCents, solved.answerCents]) {
          expect(Number.isSafeInteger(cents)).toBe(true);
          expect(cents).toBeGreaterThan(0);
          expect(cents).toBeLessThanOrEqual(250000);
        }
        if (solved.wrongBaseAnswer !== undefined) {
          expect(solved.answerCents).not.toBe(solved.wrongBaseAnswer);
        }
        if (question.choices) {
          expect(solved.kind).toBe('reverse-remainders');
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices.filter(choice => choice === expected)).toHaveLength(1);
          for (const choice of question.choices) {
            expect(choice).toMatch(/^\d+\.\d{2}$/);
            expect(Number(choice)).toBeGreaterThan(0);
          }
          reverseChoiceCount++;
        } else if (solved.kind === 'reverse-remainders') {
          reverseEntryCount++;
        }
        const seen = contexts.get(solved.kind) ?? new Set<string>();
        seen.add(JSON.stringify(question.context));
        contexts.set(solved.kind, seen);
      }
    }
    expect(contexts.size).toBe(4);
    for (const seen of contexts.values()) expect(seen.size).toBeGreaterThan(10);
    expect(reverseChoiceCount).toBeGreaterThan(0);
    expect(reverseEntryCount).toBeGreaterThan(0);
  });

  it('is deterministic and presents all four variants over four successive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('successive-percentage-factors');
    for (const seed of [-17, 0, 1, 42, 987654321]) {
      const kinds = new Set<Kind>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        kinds.add(solveVisible(visibleOnly(question)).kind);
        keys.add(question.key);
      }
      expect(kinds.size).toBe(4);
      expect(keys.size).toBe(4);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  });

  it('the visible-givens solver handles independently authored examples', () => {
    const examples: [Visible, number][] = [
      [{prompt: 'What is the total price, including tax?', context: [
        'A sports bag has a marked price of $240.00.',
        'The shop gives a 15% discount on the marked price.',
        'A tax of 8% is then charged on the discounted price.',
      ]}, 22032],
      [{prompt: 'How much gift money did Lina have at first?', context: [
        'Lina used 30% of her gift money to buy art materials.',
        'She then donated 40% of the money left.',
        'After these two payments, she had $210.00 left.',
      ]}, 50000],
      [{prompt: 'How much money did the club spend on food?', context: [
        'A class club had $300.00 for an outing.',
        'It spent 30% of this money on transport.',
        'It then spent 15% of the money left on food.',
      ]}, 3150],
      [{prompt: 'How much money was in the account after the second year?', context: [
        'A club put $800.00 in a savings account.',
        'At the end of the first year, the bank added 3% of the starting balance as interest.',
        'At the end of the second year, the bank added 4% of the balance after the first year as interest.',
        'No other money was added to or taken from the account.',
      ]}, 85696],
    ];
    for (const [visible, expectedCents] of examples) {
      expect(solveVisible(visible).answerCents).toBe(expectedCents);
    }
  });
});
