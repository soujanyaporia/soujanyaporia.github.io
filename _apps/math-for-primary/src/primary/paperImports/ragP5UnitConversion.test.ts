import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragP5UnitConversion';

// This solver receives only visible givens and response labels.
// Its scales use centimetres, grams and millilitres as independent base units.
type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'unit' | 'structuredResponse'>;
const UNITS: Record<string, {dimension: string; scale: number; name: string}> = {
  cm: {dimension: 'length', scale: 1, name: 'centimetres'},
  m: {dimension: 'length', scale: 100, name: 'metres'},
  km: {dimension: 'length', scale: 100000, name: 'kilometres'},
  g: {dimension: 'mass', scale: 1, name: 'grams'},
  kg: {dimension: 'mass', scale: 1000, name: 'kilograms'},
  ml: {dimension: 'volume', scale: 1, name: 'millilitres'},
  L: {dimension: 'volume', scale: 1000, name: 'litres'},
};

function unit(symbol: string) {
  const result = UNITS[symbol];
  if (!result) throw new Error(`Unknown visible unit: ${symbol}`);
  return result;
}

function termsFrom(q: VisibleQuestion) {
  const terms = Array.from(
    (q.context ?? []).join(' ').matchAll(/(\d+)\s+(km|kg|cm|ml|m|g|L)\b/g),
    match => ({amount: Number(match[1]), symbol: match[2]!}),
  );
  const first = terms[0];
  if (!first) throw new Error('No visible measurement');
  const dimension = unit(first.symbol).dimension;
  if (terms.some(term => unit(term.symbol).dimension !== dimension)) {
    throw new Error('Incompatible visible units');
  }
  return {terms, dimension};
}

type Solution =
  | {kind: 'scalar'; value: number}
  | {kind: 'pair'; values: [number, number]; factor: number};

function solveVisible(q: VisibleQuestion): Solution {
  const {terms, dimension} = termsFrom(q);
  const total = terms.reduce((sum, term) => sum + term.amount * unit(term.symbol).scale, 0);
  if (q.structuredResponse) {
    if (q.structuredResponse.kind !== 'number-pair') throw new Error('Unexpected response');
    const large = unit(q.structuredResponse.firstLabel);
    const small = unit(q.structuredResponse.secondLabel);
    if (large.dimension !== dimension || small.dimension !== dimension || large.scale <= small.scale) {
      throw new Error('Invalid mixed-unit labels');
    }
    const first = Math.floor(total / large.scale);
    const second = (total - first * large.scale) / small.scale;
    return {kind: 'pair', values: [first, second], factor: large.scale / small.scale};
  }
  if (!q.unit) throw new Error('Missing visible target unit');
  const target = unit(q.unit);
  if (target.dimension !== dimension) throw new Error('Incompatible target unit');
  return {kind: 'scalar', value: total / target.scale};
}

function visible(q: Question): VisibleQuestion {
  return {
    prompt: q.prompt,
    context: q.context,
    unit: q.unit,
    structuredResponse: q.structuredResponse,
  };
}

const SEEDS = [0, 1, -1, 97, 65537, 2147483647,
  ...Array.from({length: 64}, (_, i) => i * 104729 - 900001)];

describe('metric unit-conversion candidate', () => {
  test('the independent solver handles zero places and mixed-unit boundaries', () => {
    expect(solveVisible({prompt: '', context: ['A mass is 8 kg 9 g.'], unit: 'g'}))
      .toEqual({kind: 'scalar', value: 8009});
    expect(solveVisible({prompt: '', context: ['A mass is 4307 g.'], unit: 'kg'}))
      .toEqual({kind: 'scalar', value: 4.307});
    expect(solveVisible({prompt: '', context: ['A distance is 4060 m.'], unit: 'km'}))
      .toEqual({kind: 'scalar', value: 4.06});
    expect(solveVisible({prompt: '', context: ['A length is 807 cm.'], unit: 'm'}))
      .toEqual({kind: 'scalar', value: 8.07});
    for (const [amount, expected] of [[24001, [24, 1]], [24999, [24, 999]]] as const) {
      expect(solveVisible({
        prompt: '', context: [`A mass is ${amount} g.`],
        structuredResponse: {kind: 'number-pair', firstLabel: 'kg', secondLabel: 'g'},
      })).toEqual({kind: 'pair', values: expected, factor: 1000});
    }
  });

  test('answers and choices agree with visible givens across varied seeds and indices', () => {
    const forms = new Set<string>();
    const pairs = new Set<string>();
    const decimalPlaces = new Set<number>();
    let sawLeadingDecimalZero = false;
    let sawMinimumRemainder = false;
    let sawMaximumRemainder = false;

    for (const seed of SEEDS) for (let index = 0; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      const givens = visible(q);
      const result = solveVisible(givens);
      const {terms} = termsFrom(givens);
      expect(q.picture).toBeUndefined();
      expect(q.hint.length).toBeGreaterThan(0);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
      expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));

      if (result.kind === 'pair') {
        forms.add('mixed-answer');
        expect(terms).toHaveLength(1);
        expect(q.choices).toBeUndefined();
        expect(JSON.parse(q.answer)).toEqual(result.values.map(String));
        expect(result.values.every(Number.isInteger)).toBe(true);
        expect(result.values[0]).toBeGreaterThan(0);
        expect(result.values[1]).toBeGreaterThan(0);
        expect(result.values[1]).toBeLessThan(result.factor);
        expect(q.prompt).toContain(`fewer than ${result.factor}`);
        const spec = q.structuredResponse;
        if (!spec || spec.kind !== 'number-pair') throw new Error('Missing mixed response');
        expect(q.prompt).toContain(unit(spec.firstLabel).name);
        expect(q.prompt).toContain(unit(spec.secondLabel).name);
        pairs.add(`${spec.firstLabel}:${spec.secondLabel}`);
        sawMinimumRemainder ||= result.values[1] === 1;
        sawMaximumRemainder ||= result.values[1] === result.factor - 1;
      } else {
        expect(Number(q.answer)).toBeCloseTo(result.value, 10);
        expect(q.prompt).toContain(unit(q.unit!).name);
        if (q.choices) {
          forms.add('compound-choice');
          expect(terms).toHaveLength(2);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices.every(choice => /^\d+$/.test(choice))).toBe(true);
          expect(q.choices.filter(choice => Number(choice) === result.value)).toHaveLength(1);
          expect(q.choices).toContain(q.answer);
          const first = terms[0]!;
          const second = terms[1]!;
          const factor = unit(first.symbol).scale / unit(second.symbol).scale;
          expect(first.amount).toBeGreaterThan(0);
          expect(second.amount).toBeGreaterThan(0);
          expect(second.amount).toBeLessThan(factor);
          pairs.add(`${first.symbol}:${second.symbol}`);
        } else {
          forms.add('decimal-entry');
          expect(terms).toHaveLength(1);
          expect(q.prompt).toContain('as a decimal');
          expect(q.answer).toMatch(/^\d+\.\d{2,3}$/);
          const independentText = String(result.value);
          decimalPlaces.add(independentText.split('.')[1]!.length);
          sawLeadingDecimalZero ||= /^\d+\.0/.test(independentText);
          pairs.add(`${q.unit}:${terms[0]!.symbol}`);
        }
      }
    }
    expect([...forms].sort()).toEqual(['compound-choice', 'decimal-entry', 'mixed-answer']);
    expect([...pairs].sort()).toEqual(['L:ml', 'kg:g', 'km:m', 'm:cm']);
    expect([...decimalPlaces].sort()).toEqual([2, 3]);
    expect(sawLeadingDecimalZero).toBe(true);
    expect(sawMinimumRemainder).toBe(true);
    expect(sawMaximumRemainder).toBe(true);
  });

  test('generation is repeatable and each seed visits all three response forms', () => {
    const signatures = new Set<string>();
    for (const seed of SEEDS) {
      const forms = new Set<string>();
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(q.key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
        forms.add(q.structuredResponse ? 'pair' : q.choices ? 'choice' : 'entry');
        signatures.add(JSON.stringify(visible(q)));
      }
      expect(forms.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(signatures.size).toBeGreaterThan(100);
  });
});
