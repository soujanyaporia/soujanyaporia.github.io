import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragFractionComparisonOrdering';

type Visible = Pick<Question, 'prompt' | 'display' | 'choices' | 'order'>;
type Fraction = {n: number; d: number; text: string};

function parseFraction(text: string): Fraction {
  const match = /^(\d+)\/(\d+)$/.exec(text.trim());
  if (!match) throw new Error(`Invalid visible fraction: ${text}`);
  return {n: Number(match[1]), d: Number(match[2]), text: text.trim()};
}
const parseRow = (text: string): Fraction[] => text.split(',').map(parseFraction);

// Independent solver: find equal-sized parts by searching multiples. It reads
// only visible fractions, directions and bounds, never generation parameters.
function scaleTogether(fractions: Fraction[]): {denominator: number; values: number[]} {
  let denominator = Math.max(...fractions.map(f => f.d));
  while (fractions.some(f => denominator % f.d !== 0)) denominator++;
  return {denominator, values: fractions.map(f => f.n * (denominator / f.d))};
}
function ranked(fractions: Fraction[]): Fraction[] {
  const {values} = scaleTogether(fractions);
  return fractions.map((f, i) => ({f, value: values[i]}))
    .sort((a, b) => a.value - b.value).map(item => item.f);
}
function isAscending(fractions: Fraction[]): boolean {
  const {values} = scaleTogether(fractions);
  return values.every((value, i) => i === 0 || values[i - 1] < value);
}
function readBounds(q: Visible): Fraction[] | undefined {
  const match = /^(\d+\/\d+) < □ < (\d+\/\d+)$/.exec(q.display ?? '');
  return match ? [parseFraction(match[1]), parseFraction(match[2])] : undefined;
}
function only(values: string[]): string {
  if (values.length !== 1) throw new Error(`Expected exactly one solution, found ${values.length}`);
  return values[0];
}
function solveVisible(q: Visible): string {
  if (q.order) {
    const sorted = ranked(q.order.map(parseFraction));
    if (q.prompt.includes('greatest to smallest')) sorted.reverse();
    else if (!q.prompt.includes('smallest to greatest')) throw new Error('Missing ordering direction');
    return sorted.map(f => f.text).join(',');
  }
  if (!q.choices || q.choices.length !== 4) throw new Error('Expected four visible choices');
  if (q.choices.some(choice => choice.includes(','))) {
    return only(q.choices.filter(choice => isAscending(parseRow(choice))));
  }
  const fractions = q.choices.map(parseFraction);
  const bounds = readBounds(q);
  if (bounds) {
    const {values} = scaleTogether([...bounds, ...fractions]);
    return only(fractions.filter((_, i) => values[i + 2] > values[0] && values[i + 2] < values[1]).map(f => f.text));
  }
  if (!q.prompt.includes('smallest value')) throw new Error('Unrecognised visible task');
  const {values} = scaleTogether(fractions);
  const minimum = Math.min(...values);
  return only(fractions.filter((_, i) => values[i] === minimum).map(f => f.text));
}
function visible(q: Question): Visible {
  return {prompt: q.prompt, display: q.display, choices: q.choices, order: q.order};
}
function groups(q: Visible): Fraction[][] {
  if (q.order) return [q.order.map(parseFraction)];
  if (!q.choices) throw new Error('No visible givens');
  return q.choices.some(choice => choice.includes(','))
    ? q.choices.map(parseRow)
    : [q.choices.map(parseFraction)];
}
function format(q: Visible): string {
  if (q.order) return q.prompt.includes('greatest to smallest') ? 'descending-order' : 'ascending-order';
  if (readBounds(q)) return 'strict-between';
  if (q.choices?.some(choice => choice.includes(','))) return 'ascending-rows';
  return 'smallest';
}
function sampleQuestions(): Question[] {
  const seeds = [-2147483648, -1001, -1, 0, 1, 42, 2147483647,
    ...Array.from({length: 80}, (_, i) => 17 + 7919 * i)];
  return seeds.flatMap(seed => Array.from({length: 8}, (_, index) => makeRagQuestion(seed, index)));
}

describe('fraction comparison and ordering candidate', () => {
  it('independently solves visible givens across seeds and all response forms', () => {
    const seen = new Set<string>();
    const signatures = new Set<string>();
    for (const q of sampleQuestions()) {
      const givens = visible(q);
      const expected = solveVisible(givens);
      expect(q.answer).toBe(expected);
      seen.add(format(givens));
      signatures.add(JSON.stringify(givens));
      expect(q.hint.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(0);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
      expect(q.picture).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      if (q.order) {
        expect([3, 4]).toContain(q.order.length);
        expect(q.order.join(',')).not.toBe(expected);
        expect(q.answer.split(',').sort()).toEqual([...q.order].sort());
      } else {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      }
      for (const group of groups(givens)) {
        const {denominator, values} = scaleTogether(group);
        expect(denominator).toBeLessThanOrEqual(60);
        expect(new Set(values).size).toBe(group.length);
        if (!q.order) expect(group).toHaveLength(4);
        for (const f of group) {
          expect(f.n).toBeGreaterThan(0);
          expect(f.n).toBeLessThan(f.d);
          expect(f.d).toBeGreaterThanOrEqual(2);
          expect(f.d).toBeLessThanOrEqual(12);
          // Check reduction by trial division, independently of generator gcd.
          for (let divisor = 2; divisor <= f.n; divisor++) {
            expect(f.n % divisor === 0 && f.d % divisor === 0).toBe(false);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual([
      'ascending-order', 'ascending-rows', 'descending-order', 'smallest', 'strict-between',
    ]);
    expect(signatures.size).toBeGreaterThan(80);
  });

  it('excludes both endpoints and has exactly one strict interior choice', () => {
    const outsideSides = new Set<string>();
    let count = 0;
    for (const q of sampleQuestions()) {
      const givens = visible(q);
      const bounds = readBounds(givens);
      if (!bounds) continue;
      count++;
      const choices = q.choices!.map(parseFraction);
      expect(q.choices).toContain(bounds[0].text);
      expect(q.choices).toContain(bounds[1].text);
      const {values} = scaleTogether([...bounds, ...choices]);
      const lower = values[0], upper = values[1], optionValues = values.slice(2);
      expect(lower).toBeLessThan(upper);
      expect(optionValues.filter(v => lower < v && v < upper)).toHaveLength(1);
      expect(optionValues.filter(v => v === lower || v === upper)).toHaveLength(2);
      expect(optionValues.filter(v => v < lower || v > upper)).toHaveLength(1);
      outsideSides.add(optionValues.some(v => v < lower) ? 'below' : 'above');
      expect(q.answer).not.toBe(bounds[0].text);
      expect(q.answer).not.toBe(bounds[1].text);
    }
    expect(count).toBeGreaterThan(0);
    expect([...outsideSides].sort()).toEqual(['above', 'below']);
  });

  it('provides correct equivalent-fraction workings for every visible fraction', () => {
    for (const q of sampleQuestions()) {
      const givens = visible(q);
      const allFractions = [...groups(givens).flat(), ...(readBounds(givens) ?? [])];
      const renamed = new Set<string>();
      let equivalences = 0;
      for (const step of q.workedSteps ?? []) {
        expect(step.text.trim().length).toBeGreaterThan(0);
        const equation = step.equation ?? '';
        for (const match of equation.matchAll(/(\d+)\/(\d+) = (\d+)\/(\d+)/g)) {
          const a = Number(match[1]), b = Number(match[2]);
          const c = Number(match[3]), d = Number(match[4]);
          expect(a * d).toBe(c * b);
          expect(d).toBeGreaterThan(0);
          expect(d).toBeLessThanOrEqual(60);
          renamed.add(`${a}/${b}`);
          equivalences++;
        }
        if (/^\d+\/\d+(?: [<>] \d+\/\d+)+$/.test(equation)) {
          const parts = equation.split(/ ([<>]) /);
          for (let i = 0; i + 2 < parts.length; i += 2) {
            const a = parseFraction(parts[i]), b = parseFraction(parts[i + 2]);
            const difference = a.n * b.d - b.n * a.d;
            if (parts[i + 1] === '<') expect(difference).toBeLessThan(0);
            else expect(difference).toBeGreaterThan(0);
          }
        }
      }
      expect(equivalences).toBeGreaterThanOrEqual(3);
      for (const f of allFractions) expect(renamed.has(f.text)).toBe(true);
    }
  });

  it('is deterministic, keeps call history separate and declares valid metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('fraction-comparison-and-ordering');
    expect(RAG_PATTERN.skillIds).toEqual(['P3.S.FRAC.01', 'P3.S.FRAC.03']);
    for (const seed of [-7, 0, 19, 2048]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const first = makeRagQuestion(seed, 2);
      makeRagQuestion(seed + 9, 7);
      expect(makeRagQuestion(seed, 2)).toEqual(first);
      expect(makeRagQuestion(seed, 3).key).not.toBe(first.key);
      const variants = new Set(Array.from({length: 4}, (_, i) => {
        const kind = format(visible(makeRagQuestion(seed, i)));
        return kind.startsWith('ascending-') ? 'ascending' : kind;
      }));
      expect(variants.size).toBe(4);
    }
  });
});
