import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragAlternativePurchasesTwoPrices';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

function cents(value: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected dollars and two cent digits: ${value}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function dollars(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

// Only visible text is available here. Enumerate possible prices and check both
// balance conditions, rather than using the generator's construction formula.
function solveVisible(question: VisibleQuestion) {
  const text = (question.context ?? []).join(' ');
  const purchase = /pays \$(\d+\.\d{2}) for (\d+) (.+?) and (\d+) (.+?)\./.exec(text);
  const shortage = /is \$(\d+\.\d{2}) short of buying one more (.+?)\./.exec(text);
  const extra = /buys one more (.+?) instead/.exec(text);
  const balance = /(?:has|would have) \$(\d+\.\d{2}) left\./.exec(text);
  if (!purchase || !shortage || !extra || !balance) {
    throw new Error('The visible purchase or alternative balances are incomplete.');
  }

  const total = cents(purchase[1]);
  const higherCount = Number(purchase[2]);
  const lowerCount = Number(purchase[4]);
  const shortfall = cents(shortage[1]);
  const leftover = cents(balance[1]);
  const higherName = shortage[2];
  const lowerName = extra[1];
  const solutions: {higher: number; lower: number; remaining: number; initial: number}[] = [];

  for (let higher = 1; higher <= Math.floor(total / higherCount); higher++) {
    const lowerTotal = total - higherCount * higher;
    if (lowerTotal <= 0 || lowerTotal % lowerCount !== 0) continue;
    const lower = lowerTotal / lowerCount;
    const remaining = higher - shortfall;
    if (remaining >= 0 && remaining - lower === leftover) {
      solutions.push({higher, lower, remaining, initial: total + remaining});
    }
  }
  if (solutions.length !== 1) {
    throw new Error(`Visible givens have ${solutions.length} positive whole-cent solutions.`);
  }

  const solution = solutions[0];
  const differencePrompt = `(a) How much more does one ${higherName} cost than one ${lowerName}?`;
  const pricePrompt = `(a) What is the price of one ${higherName}?`;
  const asksDifference = question.prompt.startsWith(differencePrompt);
  if (!asksDifference && !question.prompt.startsWith(pricePrompt)) {
    throw new Error('Part (a) does not identify the expected price or price difference.');
  }
  if (!/\(b\) How much money did .+ have before buying anything\?/.test(question.prompt)) {
    throw new Error('The linked initial-funds question is missing.');
  }

  return {
    ...solution,
    total,
    higherCount,
    lowerCount,
    shortfall,
    leftover,
    answers: [asksDifference ? solution.higher - solution.lower : solution.higher, solution.initial],
    mode: asksDifference ? 'difference' : text.includes('would have') ? 'hypothetical-price' : 'actual-price',
  };
}

function visibleOnly(question: Question): VisibleQuestion {
  return {context: question.context, prompt: question.prompt};
}

const SEEDS = [-2147483648, -1, 0, ...Array.from({length: 96}, (_, i) => i + 1), 2147483647];

describe('alternative purchases with two prices', () => {
  it('independently solves a specified set of visible givens for either first task', () => {
    const context = [
      'At a craft shop, Kai pays $19.20 for 4 paintbrushes and 4 pencils.',
      'All paintbrushes have the same price, and all pencils have the same price.',
      'After paying for these items, Kai is $0.35 short of buying one more paintbrush.',
      'With that money, Kai buys one more pencil instead and has $0.85 left.',
    ];
    const second = '(b) How much money did Kai have before buying anything? Give both amounts in dollars.';
    const difference = solveVisible({
      context,
      prompt: `(a) How much more does one paintbrush cost than one pencil? ${second}`,
    });
    expect(difference.answers).toEqual([120, 2185]);
    expect(difference.higher).toBe(300);
    expect(difference.lower).toBe(180);
    expect(difference.remaining).toBe(265);
    expect(solveVisible({context, prompt: `(a) What is the price of one paintbrush? ${second}`}).answers)
      .toEqual([300, 2185]);
  });

  it('matches independently solved visible givens across varied seeds and indices', () => {
    const modes = new Set<string>();
    const scenarios = new Set<string>();
    for (const seed of SEEDS) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        const expected = solved.answers.map(dollars);
        expect(JSON.parse(question.answer)).toEqual(expected);
        expect(solved.shortfall).toBeGreaterThan(0);
        expect(solved.leftover).toBeGreaterThan(0);
        expect(solved.higher).toBeGreaterThan(solved.remaining);
        expect(solved.remaining).toBeGreaterThan(solved.lower);
        expect(solved.lower).toBeGreaterThan(0);
        expect(solved.initial).toBeLessThan(10000);
        expect(solved.higherCount + solved.lowerCount).toBeLessThanOrEqual(9);
        expect(solved.higherCount * solved.higher + solved.lowerCount * solved.lower).toBe(solved.total);
        expect(solved.initial - solved.total + solved.shortfall).toBe(solved.higher);
        expect(solved.initial - solved.total - solved.lower).toBe(solved.leftover);
        expect(question.picture).toBeUndefined();
        expect(question.structuredResponse).toMatchObject({kind: 'number-pair', decimal: true});
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(question.workedSteps?.every(step => Boolean(step.text && step.equation))).toBe(true);
        expect(question.explanation).toContain(`$${dollars(solved.initial)}`);
        modes.add(solved.mode);
        scenarios.add(JSON.stringify([solved.higherCount, solved.lowerCount, solved.total, solved.shortfall, solved.leftover]));
      }
    }
    expect([...modes].sort()).toEqual(['actual-price', 'difference', 'hypothetical-price']);
    expect(scenarios.size).toBeGreaterThan(100);
  });

  it('grades both monetary fields, accepts equivalent decimals and rejects one-cent errors', () => {
    for (let seed = 0; seed < 24; seed++) {
      const question = makeRagQuestion(seed, seed % 4);
      const solved = solveVisible(visibleOnly(question));
      const spec = question.structuredResponse;
      if (!spec || spec.kind !== 'number-pair') throw new Error('Expected two linked money fields.');
      expect(spec.firstLabel).toContain('(a)');
      expect(spec.secondLabel).toContain('(b)');
      expect(spec.firstLabel).toContain('($)');
      expect(spec.secondLabel).toContain('($)');
      const expected = solved.answers.map(dollars);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(expected))).toBe(true);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(solved.answers.map(value => String(value / 100))))).toBe(true);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([dollars(solved.answers[0] + 1), expected[1]]))).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([expected[0], dollars(solved.answers[1] + 1)]))).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([...expected].reverse()))).toBe(false);
      expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([expected[0]]))).toBe(false);
    }
  });

  it('reproduces the same questions and declares supported curriculum skills', () => {
    for (const seed of [-1, 0, 17, 2147483647]) {
      for (const index of [0, 1, 2, 9]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-alternative-purchases-two-prices');
    const supported = new Set(['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06']);
    expect(RAG_PATTERN.skillIds.every(id => supported.has(id))).toBe(true);
  });
});
