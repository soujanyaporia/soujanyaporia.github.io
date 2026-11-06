import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragWholeRemainderPartitions';

type Colour = 'red' | 'blue' | 'yellow';
type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'whole-fractions' | 'percentage-split' | 'difference-total';
  total: number;
  counts: Record<Colour, number>;
  order: Colour[];
};

// This solver receives only learner-visible text. It searches for integer
// populations satisfying that text; it does not use generator parameters,
// answers, explanations, worked steps or generation helpers.
function solveVisible(visible: Visible): Solution {
  const text = (visible.context ?? []).join('\n');
  const redFraction = /(\d+)\/(\d+) of all the buttons are red\./.exec(text);
  const redPercent = /(\d+)% of all the buttons are red\./.exec(text);
  const blueFraction = /(\d+)\/(\d+) of all the buttons are blue\./.exec(text);
  const split = /Among the remaining buttons, blue : yellow = (\d+) : (\d+)\./.exec(text);
  const difference = /There are (\d+) more red buttons than yellow buttons\./.exec(text);
  const orderMatch = /ratio of (red|blue|yellow) buttons to (red|blue|yellow) buttons to (red|blue|yellow) buttons\?/.exec(visible.prompt);
  if ((!redFraction && !redPercent) || (!blueFraction && !split)) {
    throw new Error('Incomplete visible partition givens');
  }
  const numerator = Number(redFraction?.[1] ?? redPercent?.[1]);
  const denominator = redFraction ? Number(redFraction[2]) : 100;
  const kind: Solution['kind'] = difference ? 'difference-total' : redPercent ? 'percentage-split' : 'whole-fractions';
  const order = orderMatch ? orderMatch.slice(1) as Colour[] : [];
  if (!difference && (order.length !== 3 || new Set(order).size !== 3)) {
    throw new Error('Missing or repeated requested ratio categories');
  }
  const matches: Solution[] = [];
  for (let total = 3; total <= 3000; total++) {
    if ((total * numerator) % denominator !== 0) continue;
    const red = total * numerator / denominator;
    const blueNumerator = blueFraction
      ? total * Number(blueFraction[1])
      : (total - red) * Number(split![1]);
    const blueDenominator = blueFraction
      ? Number(blueFraction[2])
      : Number(split![1]) + Number(split![2]);
    if (blueNumerator % blueDenominator !== 0) continue;
    const blue = blueNumerator / blueDenominator;
    const yellow = total - red - blue;
    if (Math.min(red, blue, yellow) <= 0) continue;
    if (difference && red - yellow !== Number(difference[1])) continue;
    const result = {kind, total, counts: {red, blue, yellow}, order};
    // The first possible integer population gives the primitive ratio.
    if (!difference) return result;
    matches.push(result);
  }
  if (matches.length !== 1) throw new Error(`Expected one total, found ${matches.length}`);
  return matches[0];
}

function primitive(parts: number[]): number[] {
  // Trial division deliberately differs from the generator's Euclidean gcd.
  for (let factor = Math.min(...parts); factor >= 2; factor--) {
    if (parts.every(n => n % factor === 0)) return parts.map(n => n / factor);
  }
  return parts;
}

function ratioChoiceParts(choice: string): number[] {
  if (!/^\d+\s*:\s*\d+\s*:\s*\d+$/.test(choice)) {
    throw new Error(`Invalid ratio choice: ${choice}`);
  }
  const parts = choice.split(':').map(Number);
  if (parts.some(n => n <= 0)) throw new Error('Ratio choices must be positive');
  return parts;
}

describe('whole and remainder partitions', () => {
  test('independently solves visible givens across all variants, seeds and indices', () => {
    const kinds = new Set<string>();
    const orders = new Set<string>();
    const questions = new Set<string>();
    const seeds = [...Array.from({length: 192}, (_, i) => i - 64), 1000003, 2147483647, 4294967295];
    for (const seed of seeds) {
      for (const index of [0, 1, 7]) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        kinds.add(solved.kind);
        questions.add(JSON.stringify([q.context, q.prompt]));
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(50);
        expect(q.picture).toBeUndefined();
        expect(Object.values(solved.counts).every(n => Number.isInteger(n) && n > 0)).toBe(true);

        if (solved.kind === 'difference-total') {
          expect(q.answer).toBe(String(solved.total));
          expect(q.unit).toBe('buttons');
          expect(solved.total).toBeLessThanOrEqual(1728);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => Number(choice) === solved.total)).toHaveLength(1);
          expect(q.choices!.every(choice => /^\d+$/.test(choice) && Number(choice) > 0)).toBe(true);
          expect(q.structuredResponse).toBeUndefined();
          continue;
        }

        orders.add(solved.order.join(':'));
        const expected = solved.order.map(colour => solved.counts[colour]);
        expect(primitive(expected)).toEqual(expected);
        expect(q.unit).toBeUndefined();
        if (solved.kind === 'whole-fractions') {
          expect(q.answer).toBe(expected.join(' : '));
          expect(q.choices).toHaveLength(4);
          const choiceParts = q.choices!.map(ratioChoiceParts);
          const normalised = choiceParts.map(parts => primitive(parts).join(':'));
          expect(new Set(normalised).size).toBe(4);
          expect(normalised.filter(value => value === expected.join(':'))).toHaveLength(1);
          for (const parts of choiceParts) expect(primitive(parts)).toEqual(parts);
          expect(q.structuredResponse).toBeUndefined();
        } else {
          expect(JSON.parse(q.answer)).toEqual(expected.map(String));
          expect(q.choices).toBeUndefined();
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Expected three ratio fields');
          expect(spec.fields.map(field => field.label.toLowerCase())).toEqual(solved.order.map(colour => `${colour} buttons`));
          expect(spec.fields).toHaveLength(3);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['difference-total', 'percentage-split', 'whole-fractions']);
    expect(orders.size).toBe(6);
    expect(questions.size).toBeGreaterThan(50);
  });

  test('constructed responses accept the primitive ratio and reject scaled or reordered terms', () => {
    for (let seed = 1; seed < 120; seed += 3) {
      const q = makeRagQuestion(seed);
      const solved = solveVisible({context: q.context, prompt: q.prompt});
      expect(solved.kind).toBe('percentage-split');
      const spec = q.structuredResponse;
      if (!spec || spec.kind !== 'number-fields') throw new Error('Expected ratio fields');
      const values = solved.order.map(colour => solved.counts[colour]);
      const encode = (parts: number[]) => JSON.stringify(parts.map(String));
      expect(structuredResponseCorrect(spec, q.answer, encode(values))).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, encode(values.map(n => 2 * n)))).toBe(false);
      const unequal = values.findIndex(n => n !== values[0]);
      expect(unequal).toBeGreaterThan(0);
      const swapped = [...values];
      [swapped[0], swapped[unequal]] = [swapped[unequal], swapped[0]];
      expect(structuredResponseCorrect(spec, q.answer, encode(swapped))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(values.slice(0, 2).map(String)))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, encode([0, values[1], values[2]]))).toBe(false);
    }
  });

  test('generation is deterministic and defaults to index zero', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-whole-remainder-partitions');
    for (const seed of [-17, 0, 1, 23, 197, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 2, 19]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      expect(new Set([0, 1, 2].map(index => makeRagQuestion(seed, index).key)).size).toBe(3);
    }
  });
});
