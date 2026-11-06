import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragTwoPricePurchases';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Receipt = {notebooks: number; markers: number; cents: number};
type Kind = 'price' | 'mixed-quantity' | 'new-cost' | 'pure-quantity';

function readCents(value: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(value);
  if (!match) throw new Error(`Expected a two-place money amount: ${value}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

// This solver receives only learner-visible givens. It does not import generation
// helpers or read the answer, explanation, key, worked steps or hidden prices.
function solveVisible(question: VisibleQuestion) {
  const receipts: Receipt[] = [];
  for (const line of question.context ?? []) {
    const mixed = /^A purchase of (\d+) notebooks and (\d+) markers costs \$(\d+\.\d{2})\.$/.exec(line);
    const pure = /^Buying only (\d+) notebooks costs \$(\d+\.\d{2})\.$/.exec(line);
    if (mixed) receipts.push({notebooks: Number(mixed[1]), markers: Number(mixed[2]), cents: readCents(mixed[3])});
    if (pure) receipts.push({notebooks: Number(pure[1]), markers: 0, cents: readCents(pure[2])});
  }
  if (receipts.length !== 2) throw new Error('Exactly two visible purchase totals are required');
  const [first, second] = receipts;
  const determinant = first.notebooks * second.markers - second.notebooks * first.markers;
  if (determinant === 0) throw new Error('The prices are not uniquely determined');
  // Solve both prices directly from the two visible constraints, independently
  // of the generator's selected prices and instructional scaling sequence.
  const notebook = (first.cents * second.markers - second.cents * first.markers) / determinant;
  const marker = (first.notebooks * second.cents - second.notebooks * first.cents) / determinant;
  if (![notebook, marker].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new Error('Unit prices must be positive whole cents');
  }
  for (const receipt of receipts) {
    if (receipt.notebooks * notebook + receipt.markers * marker !== receipt.cents) {
      throw new Error('Recovered prices do not satisfy a visible purchase');
    }
  }
  let value: number;
  let kind: Kind;
  let unit: string;
  const quantity = /^With \$(\d+\.\d{2}), how many markers can be bought if all the money is spent on markers\?$/.exec(question.prompt);
  const newCost = /^What is the total price of 1 notebook and (\d+) markers?\?$/.exec(question.prompt);
  if (question.prompt === 'What is the price of one marker?') {
    value = marker;
    kind = 'price';
    unit = 'dollars';
  } else if (quantity) {
    const budget = readCents(quantity[1]);
    if (budget % marker !== 0) throw new Error('The budget cannot be spent exactly on whole markers');
    value = budget / marker;
    kind = receipts.some(receipt => receipt.markers === 0) ? 'pure-quantity' : 'mixed-quantity';
    unit = 'markers';
  } else if (newCost) {
    const count = Number(newCost[1]);
    for (const receipt of receipts) {
      if (receipt.notebooks * count === receipt.markers) throw new Error('Target is proportional to a supplied purchase');
    }
    value = notebook + count * marker;
    kind = 'new-cost';
    unit = 'dollars';
  } else {
    throw new Error('Unrecognised visible response task');
  }
  return {value, kind, unit, notebook, marker, receipts};
}

const kinds: Kind[] = ['price', 'mixed-quantity', 'new-cost', 'pure-quantity'];

describe('two-price purchase candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    const context = [
      'A purchase of 2 notebooks and 3 markers costs $15.05.',
      'A purchase of 6 notebooks and 13 markers costs $52.55.',
    ];
    const price = solveVisible({context, prompt: 'What is the price of one marker?'});
    expect(price.notebook).toBe(475);
    expect(price.marker).toBe(185);
    expect(price.value).toBe(185);
    expect(solveVisible({context, prompt: 'With $18.50, how many markers can be bought if all the money is spent on markers?'}).value).toBe(10);
    expect(solveVisible({context, prompt: 'What is the total price of 1 notebook and 4 markers?'}).value).toBe(1215);
    const pure = solveVisible({
      context: [
        'A purchase of 6 notebooks and 8 markers costs $21.60.',
        'Buying only 12 notebooks costs $21.60.',
      ],
      prompt: 'With $21.60, how many markers can be bought if all the money is spent on markers?',
    });
    expect(pure.kind).toBe('pure-quantity');
    expect(pure.notebook).toBe(180);
    expect(pure.marker).toBe(135);
    expect(pure.value).toBe(16);
  });

  it('independently solves visible givens across varied seeds and all four forms', () => {
    const seeds = [-2147483648, -123, -1, 0, 1, 2, 7, 19, 42, 255, 65535, 2147483647,
      ...Array.from({length: 96}, (_, i) => (i + 1) * 7919)];
    const seen = new Set<Kind>();
    const visibleQuestions = new Set<string>();
    let sawNonWholeDollarAnswer = false;
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const result = solveVisible({context: question.context, prompt: question.prompt});
        seen.add(result.kind);
        visibleQuestions.add(JSON.stringify([question.context, question.prompt]));
        expect(question.unit).toBe(result.unit);
        if (result.unit === 'dollars') {
          expect(readCents(question.answer)).toBe(result.value);
          sawNonWholeDollarAnswer ||= result.value % 100 !== 0;
        } else {
          expect(question.answer).toMatch(/^[1-9]\d*$/);
          expect(Number(question.answer)).toBe(result.value);
        }
        expect(question.choices).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(question.picture).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(4);
        for (const step of question.workedSteps!) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation).toBeTruthy();
          expect(question.explanation).toContain(step.text);
          expect(question.explanation).toContain(step.equation!);
        }
        for (const receipt of result.receipts) {
          expect(Number.isSafeInteger(receipt.notebooks)).toBe(true);
          expect(Number.isSafeInteger(receipt.markers)).toBe(true);
          expect(receipt.notebooks).toBeGreaterThan(0);
          expect(receipt.markers).toBeGreaterThanOrEqual(0);
          expect(receipt.cents).toBeGreaterThan(0);
          expect(receipt.cents).toBeLessThan(10000);
        }
        const [first, second] = result.receipts;
        expect(first.notebooks).not.toBe(second.notebooks);
        if (result.kind === 'pure-quantity') {
          expect(second.markers).toBe(0);
          expect(first.cents).toBe(second.cents);
          expect(first.notebooks).toBeLessThan(second.notebooks);
        } else {
          const scale = second.notebooks / first.notebooks;
          expect(Number.isInteger(scale)).toBe(true);
          expect(scale).toBeGreaterThan(1);
          expect(second.markers - first.markers * scale).toBeGreaterThan(0);
          expect(second.cents - first.cents * scale).toBeGreaterThan(0);
        }
      }
    }
    expect([...seen].sort()).toEqual([...kinds].sort());
    expect(visibleQuestions.size).toBeGreaterThan(200);
    expect(sawNonWholeDollarAnswer).toBe(true);
  });

  it('is reproducible and covers every form in each four-index cycle', () => {
    for (const seed of [-19, 0, 3, 2026, 987654321]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const cycle = new Set<Kind>();
      const keys = new Set<string>();
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        keys.add(question.key);
        if (index < 4) cycle.add(solveVisible({context: question.context, prompt: question.prompt}).kind);
      }
      expect(keys.size).toBe(8);
      expect([...cycle].sort()).toEqual([...kinds].sort());
    }
  });

  it('rejects ambiguous or non-integral visible constraints in the independent solver', () => {
    expect(() => solveVisible({
      context: [
        'A purchase of 2 notebooks and 3 markers costs $15.05.',
        'A purchase of 4 notebooks and 6 markers costs $30.10.',
      ],
      prompt: 'What is the price of one marker?',
    })).toThrow('not uniquely determined');
    expect(() => solveVisible({
      context: [
        'A purchase of 2 notebooks and 3 markers costs $15.05.',
        'A purchase of 6 notebooks and 13 markers costs $52.55.',
      ],
      prompt: 'With $18.51, how many markers can be bought if all the money is spent on markers?',
    })).toThrow('cannot be spent exactly');
  });

  it('declares the requested level, family and valid curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-two-price-purchase-equations');
    const allowed = new Set(['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06']);
    expect(RAG_PATTERN.skillIds.length).toBeGreaterThan(0);
    for (const skill of RAG_PATTERN.skillIds) expect(allowed.has(skill)).toBe(true);
  });
});
