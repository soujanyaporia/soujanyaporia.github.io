import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragPriceRatiosMixedCost';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type TargetKind = 'unit' | 'category' | 'difference';

function matchOrThrow(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Unrecognised visible text: ${text}`);
  return match;
}

function centsFromText(text: string): number {
  const match = matchOrThrow(/^(\d+)\.(\d{2})$/, text);
  return Number(match[1]) * 100 + Number(match[2]);
}

// This solver receives only the context and prompt. It enumerates possible
// cent prices, checks the purchase and price relationship, then answers the
// visible target. It never uses worked steps, the stored answer or the RNG.
function solveVisible(q: VisibleQuestion) {
  const lines = q.context ?? [];
  const first = lines[0] ?? '';
  const multiple = /^One (\w+) costs (\d+) times as much as one (\w+)\.$/.exec(first);
  const fraction = /^The price of one (\w+) is (\d+)\/(\d+) of the price of one (\w+)\.$/.exec(first);
  const bundle = /^For the same price, you can buy one (\w+) or (\d+) (\w+)\.$/.exec(first);
  let a: string;
  let b: string;
  let numerator: number;
  let denominator: number;
  let relation: string;
  if (multiple) {
    a = multiple[1]!;
    b = multiple[3]!;
    numerator = Number(multiple[2]);
    denominator = 1;
    relation = 'multiple';
  } else if (fraction) {
    a = fraction[4]!;
    b = fraction[1]!;
    numerator = Number(fraction[3]);
    denominator = Number(fraction[2]);
    relation = 'fraction';
  } else if (bundle) {
    a = bundle[1]!;
    b = bundle[3]!.replace(/s$/, '');
    numerator = Number(bundle[2]);
    denominator = 1;
    relation = 'bundle';
  } else {
    throw new Error('Missing or unreadable price relationship');
  }
  if (!(numerator > denominator && denominator > 0)) {
    throw new Error('The first item must have the higher positive price');
  }

  const purchase = matchOrThrow(
    /^A class pays \$(\d+\.\d{2}) for (\d+) (\w+) and (\d+) (\w+)\.$/,
    lines[2] ?? '',
  );
  if (purchase[3] !== `${a}s` || purchase[5] !== `${b}s`) {
    throw new Error('Purchase items do not match the stated relationship');
  }
  const totalCents = centsFromText(purchase[1]!);
  const countA = Number(purchase[2]);
  const countB = Number(purchase[4]);
  if (!Number.isInteger(countA) || !Number.isInteger(countB) || countA <= 0 || countB <= 0) {
    throw new Error('Item counts must be positive whole numbers');
  }
  if (lines[1] !== `All ${a}s have the same price. All ${b}s have the same price.`) {
    throw new Error('Constant prices are not stated');
  }

  const solutions: Array<[number, number]> = [];
  for (let priceA = 1; priceA * countA < totalCents; priceA += 1) {
    const remaining = totalCents - countA * priceA;
    if (remaining % countB !== 0) continue;
    const priceB = remaining / countB;
    if (priceB > 0 && priceA * denominator === priceB * numerator) {
      solutions.push([priceA, priceB]);
    }
  }
  if (solutions.length !== 1) throw new Error('Expected exactly one positive cent-price solution');
  const [priceA, priceB] = solutions[0]!;

  const unit = /^What is the price of one (\w+)\? Give your answer in dollars\.$/.exec(q.prompt);
  const category = /^How much of the total was spent on the (\w+)\? Give your answer in dollars\.$/.exec(q.prompt);
  const difference = /^How much more does one (\w+) cost than one (\w+)\? Give your answer in dollars\.$/.exec(q.prompt);
  let kind: TargetKind;
  let target: 'a' | 'b' | 'both';
  let answerCents: number;
  if (unit) {
    if (unit[1] !== a && unit[1] !== b) throw new Error('Unknown unit-price target');
    target = unit[1] === a ? 'a' : 'b';
    kind = 'unit';
    answerCents = target === 'a' ? priceA : priceB;
  } else if (category) {
    if (category[1] !== `${a}s` && category[1] !== `${b}s`) throw new Error('Unknown category target');
    target = category[1] === `${a}s` ? 'a' : 'b';
    kind = 'category';
    answerCents = target === 'a' ? countA * priceA : countB * priceB;
  } else if (difference) {
    if (difference[1] !== a || difference[2] !== b) throw new Error('Difference target has the wrong direction');
    target = 'both';
    kind = 'difference';
    answerCents = priceA - priceB;
  } else {
    throw new Error('Unrecognised response target');
  }
  return {answerCents, priceA, priceB, countA, countB, totalCents, kind, target, relation};
}

const asDollars = (cents: number): string => (cents / 100).toFixed(2);

describe('price relationships and a mixed purchase', () => {
  it('solves every generated target independently from visible givens across varied seeds', () => {
    const seeds = [-2147483648, -31, -1, 0, ...Array.from({length: 80}, (_, i) => i + 1), 2147483647, 4294967295];
    const targets = new Set<string>();
    const relations = new Set<string>();
    const visibleQuestions = new Set<string>();
    let fractionalDollarAnswers = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        expect(q.answer).toBe(asDollars(solved.answerCents));
        expect(q.unit).toBe('dollars');
        expect(solved.answerCents).toBeGreaterThan(0);
        expect(solved.answerCents).toBeLessThan(solved.totalCents);
        expect(solved.priceA).toBeGreaterThan(solved.priceB);
        expect(solved.countA * solved.priceA + solved.countB * solved.priceB).toBe(solved.totalCents);
        expect(solved.totalCents).toBeLessThanOrEqual(12000);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        targets.add(`${solved.kind}:${solved.target}`);
        relations.add(solved.relation);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        if (solved.answerCents % 100 !== 0) fractionalDollarAnswers += 1;
      }
    }
    expect([...targets].sort()).toEqual(['category:a', 'category:b', 'difference:both', 'unit:a', 'unit:b']);
    expect([...relations].sort()).toEqual(['bundle', 'fraction', 'multiple']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
    expect(fractionalDollarAnswers).toBeGreaterThan(0);
  });

  it('is repeatable and exposes all three response targets over consecutive indices', () => {
    for (const seed of [-99, 0, 17, 2026, 4294967295]) {
      const kinds = new Set<TargetKind>();
      const keys = new Set<string>();
      for (const index of [-3, -2, -1, 0, 1, 2]) {
        const first = makeRagQuestion(seed, index);
        makeRagQuestion(seed + 1, index + 10);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        kinds.add(solveVisible({context: first.context, prompt: first.prompt}).kind);
        keys.add(first.key);
      }
      expect([...kinds].sort()).toEqual(['category', 'difference', 'unit']);
      expect(keys.size).toBe(6);
      const consecutive = [0, 1, 2].map(index => {
        const q = makeRagQuestion(seed, index);
        return solveVisible({context: q.context, prompt: q.prompt}).kind;
      });
      expect(new Set(consecutive).size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  it('checks the independent solver against hand-calculated visible examples and changed totals', () => {
    const context = [
      'The price of one pen is 3/4 of the price of one notebook.',
      'All notebooks have the same price. All pens have the same price.',
      'A class pays $22.00 for 4 notebooks and 2 pens.',
    ];
    const cases = [
      {prompt: 'What is the price of one notebook? Give your answer in dollars.', cents: 400},
      {prompt: 'What is the price of one pen? Give your answer in dollars.', cents: 300},
      {prompt: 'How much of the total was spent on the notebooks? Give your answer in dollars.', cents: 1600},
      {prompt: 'How much of the total was spent on the pens? Give your answer in dollars.', cents: 600},
      {prompt: 'How much more does one notebook cost than one pen? Give your answer in dollars.', cents: 100},
    ];
    for (const example of cases) {
      expect(solveVisible({context, prompt: example.prompt}).answerCents).toBe(example.cents);
      const doubled = [...context];
      doubled[2] = 'A class pays $44.00 for 4 notebooks and 2 pens.';
      expect(solveVisible({context: doubled, prompt: example.prompt}).answerCents).toBe(example.cents * 2);
    }
    for (const relation of [
      'One notebook costs 4 times as much as one pen.',
      'For the same price, you can buy one notebook or 4 pens.',
    ]) {
      const visible = {
        context: [relation, context[1]!, 'A class pays $27.00 for 4 notebooks and 2 pens.'],
        prompt: 'How much more does one notebook cost than one pen? Give your answer in dollars.',
      };
      expect(solveVisible(visible).answerCents).toBe(450);
    }
  });
});
