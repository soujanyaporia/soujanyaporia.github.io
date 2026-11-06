import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragReverseInterleavedSpending';

type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Stage = {numerator: number; denominator: number; extraCents: number};

function cents(text: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(text);
  if (!match) throw new Error(`Invalid money amount: ${text}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

// This oracle receives only visible fields, never answers, explanations,
// worked steps, random seeds or private generation parameters.
function solveVisible(q: VisibleQuestion) {
  const lines = q.context;
  if (!lines || lines.length !== 5 || q.unit !== 'dollars') {
    throw new Error('Incomplete visible money problem');
  }
  const first = /^The art kit cost (\d+)\/(\d+) of the money ([A-Za-z]+) had at the start, plus \$(\d+\.\d{2})\.$/.exec(lines[1]);
  const second = /^The puzzle cost (\d+)\/(\d+) of the money left after buying the art kit, plus \$(\d+\.\d{2})\.$/.exec(lines[2]);
  const lastFraction = /^Then [A-Za-z]+ spent (\d+)\/(\d+) of the money now left on a card game\.$/.exec(lines[3]);
  const lastFixed = /^Then [A-Za-z]+ paid \$(\d+\.\d{2}) for a snack\.$/.exec(lines[3]);
  const final = /^[A-Za-z]+ had \$(\d+\.\d{2}) left after these three purchases\.$/.exec(lines[4]);
  if (!first || !second || !final || (!lastFraction && !lastFixed)) {
    throw new Error('Missing or ambiguous visible givens');
  }
  if (q.prompt !== `How much money did ${first[3]} have before the shopping trip?`) {
    throw new Error('Unexpected response task');
  }
  const stages: Stage[] = [
    {numerator: Number(first[1]), denominator: Number(first[2]), extraCents: cents(first[4])},
    {numerator: Number(second[1]), denominator: Number(second[2]), extraCents: cents(second[3])},
  ];
  if (lastFraction) {
    stages.push({numerator: Number(lastFraction[1]), denominator: Number(lastFraction[2]), extraCents: 0});
  } else if (lastFixed) {
    stages.push({numerator: 0, denominator: 1, extraCents: cents(lastFixed[1])});
  }

  // Compose the purchases FORWARDS as (coefficient * start - offset) / divisor.
  // This is independent of the generator's backwards construction.
  let coefficient = 1;
  let offset = 0;
  let divisor = 1;
  for (const stage of stages) {
    const {numerator: n, denominator: d, extraCents: extra} = stage;
    if (!Number.isInteger(n) || !Number.isInteger(d) || n < 0 || n >= d || d > 12 || extra < 0) {
      throw new Error('Invalid fractional purchase');
    }
    const retained = d - n;
    coefficient *= retained;
    offset = offset * retained + extra * divisor * d;
    divisor *= d;
    if (![coefficient, offset, divisor].every(Number.isSafeInteger)) {
      throw new Error('Unsafe arithmetic in independent oracle');
    }
  }
  const finalCents = cents(final[1]);
  const total = finalCents * divisor + offset;
  if (total % coefficient !== 0) throw new Error('Starting money is not an exact cent amount');
  return {
    originalCents: total / coefficient,
    finalCents,
    stages,
    terminalKind: lastFraction ? 'fraction' : 'fixed',
  };
}

function fixture(finalPurchase: string, finalMoney: string): VisibleQuestion {
  return {
    context: [
      'Alya had some money for a shopping trip.',
      'The art kit cost 1/3 of the money Alya had at the start, plus $10.00.',
      'The puzzle cost 2/5 of the money left after buying the art kit, plus $6.00.',
      finalPurchase,
      `Alya had $${finalMoney} left after these three purchases.`,
    ],
    prompt: 'How much money did Alya have before the shopping trip?',
    unit: 'dollars',
  };
}

const seeds = [
  -2147483648, -1, 0, 1, 2147483647, 4294967295, Number.MAX_SAFE_INTEGER,
  ...Array.from({length: 80}, (_, i) => i * 7919 - 20000),
];

describe('reverse interleaved spending candidate', () => {
  it('solves independently specified visible problems for both final purchases', () => {
    const fractional = fixture('Then Alya spent 1/4 of the money now left on a card game.', '36.00');
    const fixed = fixture('Then Alya paid $8.00 for a snack.', '40.00');
    expect(solveVisible(fractional).originalCents).toBe(15000);
    expect(solveVisible(fixed).originalCents).toBe(15000);

    // A changed visible extra payment must change the solution without
    // consulting any stored answer. Restoring $2 more requires $3 more initially.
    const changed: VisibleQuestion = {
      ...fractional,
      context: fractional.context!.map(line => line.replace('plus $10.00.', 'plus $12.00.')),
    };
    expect(solveVisible(changed).originalCents).toBe(15300);
  });

  it('recovers every answer from visible givens across varied seeds and indices', () => {
    const endings = new Set<string>();
    const contexts = new Set<string>();
    let answersWithCents = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const visible: VisibleQuestion = {context: q.context, prompt: q.prompt, unit: q.unit};
        const solution = solveVisible(visible);
        expect(cents(q.answer)).toBe(solution.originalCents);
        expect(solution.originalCents).toBeGreaterThan(0);
        expect(solution.originalCents).toBeLessThanOrEqual(200000);
        expect(solution.finalCents).toBeGreaterThan(0);
        expect(solution.stages[0].numerator).toBeGreaterThan(0);
        expect(solution.stages[1].numerator).toBeGreaterThan(0);
        expect(solution.stages[0].extraCents).toBeGreaterThan(0);
        expect(solution.stages[1].extraCents).toBeGreaterThan(0);

        // Replay each visible purchase, checking exact cents and affordability.
        let balance = solution.originalCents;
        for (const stage of solution.stages) {
          const fractionalCost = balance * stage.numerator / stage.denominator;
          expect(Number.isSafeInteger(fractionalCost)).toBe(true);
          const cost = fractionalCost + stage.extraCents;
          expect(cost).toBeGreaterThan(0);
          expect(cost).toBeLessThan(balance);
          balance -= cost;
          expect(Number.isSafeInteger(balance)).toBe(true);
        }
        expect(balance).toBe(solution.finalCents);
        expect(q.unit).toBe('dollars');
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(5);
        for (const step of q.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation).toBeTruthy();
          expect(q.explanation).toContain(step.equation!);
        }
        endings.add(solution.terminalKind);
        contexts.add(q.context!.join('\n'));
        if (solution.originalCents % 100 !== 0) answersWithCents++;
      }
    }
    expect([...endings].sort()).toEqual(['fixed', 'fraction']);
    expect(answersWithCents).toBeGreaterThan(0);
    expect(contexts.size).toBeGreaterThan(seeds.length);
  });

  it('is repeatable and gives both variants through consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-reverse-interleaved-spending');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of seeds.slice(0, 12)) {
      const first = makeRagQuestion(seed);
      const second = makeRagQuestion(seed, 1);
      expect(first).toEqual(makeRagQuestion(seed, 0));
      expect(second).toEqual(makeRagQuestion(seed, 1));
      expect(first.key).not.toBe(second.key);
      expect(solveVisible(first).terminalKind).not.toBe(solveVisible(second).terminalKind);
    }
  });
});
