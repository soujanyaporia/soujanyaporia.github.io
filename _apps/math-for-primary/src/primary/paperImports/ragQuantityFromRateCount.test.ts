import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragQuantityFromRateCount';

type Rational = {num: number; den: number};
type Kind = 'unfinished' | 'related' | 'coins';
type Solution = Rational & {kind: Kind};
type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

function match(text: string, pattern: RegExp): RegExpMatchArray {
  const result = text.match(pattern);
  if (!result) throw new Error(`Missing visible givens: ${text}`);
  return result;
}

function reduce(num: number, den: number): Rational {
  for (let factor = Math.min(Math.abs(num), den); factor >= 2; factor--) {
    if (num % factor === 0 && den % factor === 0) return {num: num / factor, den: den / factor};
  }
  return {num, den};
}

function parseAnswer(text: string): Rational {
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(text);
  if (mixed) return reduce(Number(mixed[1]) * Number(mixed[3]) + Number(mixed[2]), Number(mixed[3]));
  const fraction = /^(\d+)\/(\d+)$/.exec(text);
  if (fraction) return reduce(Number(fraction[1]), Number(fraction[2]));
  const decimal = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!decimal) throw new Error(`Invalid numeric answer: ${text}`);
  const places = decimal[2]?.length ?? 0;
  const den = 10 ** places;
  return reduce(Number(decimal[1]) * den + Number(decimal[2] ?? 0), den);
}

function same(a: Rational, b: Rational): boolean {
  return a.num * b.den === b.num * a.den;
}

function asMixed(value: Rational): string {
  const {num, den} = reduce(value.num, value.den);
  const whole = Math.floor(num / den);
  const rest = num % den;
  if (rest === 0) return String(whole);
  return whole === 0 ? `${rest}/${den}` : `${whole} ${rest}/${den}`;
}

// This solver accepts only pupil-visible text. It cannot access answers,
// proof trees, worked solutions, generator parameters or random state.
function solveVisible(q: VisibleQuestion): Solution {
  const context = q.context ?? [];
  expect(context).toHaveLength(2);
  if (q.prompt.startsWith('How many more kilograms')) {
    const first = match(context[0], /^A craft club plans to make (\d+) clay models\. Each model needs (\d+)\/(\d+) kg of clay\.$/);
    const second = match(context[1], /^The club has finished (\d+) models and has no clay left\.$/);
    const total = Number(first[1]);
    const n = Number(first[2]);
    const d = Number(first[3]);
    const completed = Number(second[1]);
    expect(completed).toBeGreaterThan(0);
    expect(completed).toBeLessThan(total);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(d);
    expect(d).toBeLessThanOrEqual(12);
    expect(total).not.toBe(12);
    expect(completed).not.toBe(5);
    let numerator = 0;
    for (let model = completed; model < total; model++) numerator += n;
    expect(numerator).toBeGreaterThan(d);
    expect(numerator % d).not.toBe(0);
    return {kind: 'unfinished', num: numerator, den: d};
  }
  if (q.prompt.startsWith('How many metres of ribbon')) {
    const rates = match(context[0], /^Each small banner uses (\d+) (\d+)\/(\d+) m of ribbon\. Each large banner uses (\d+) times as much ribbon as a small banner\.$/);
    const counts = match(context[1], /^A class makes (\d+) small banners and (\d+) large banners\.$/);
    const whole = Number(rates[1]);
    const n = Number(rates[2]);
    const d = Number(rates[3]);
    const multiplier = Number(rates[4]);
    const small = Number(counts[1]);
    const large = Number(counts[2]);
    expect(whole).toBeGreaterThan(0);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(d);
    expect(d).toBeLessThanOrEqual(12);
    expect(multiplier).toBeGreaterThan(1);
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(0);
    expect(q.prompt).toContain('mixed number in simplest form');
    // Count one ribbon allocation at a time, including each allocation
    // within a large banner, instead of using the generator's total formula.
    const allocation = whole * d + n;
    let numerator = 0;
    for (let banner = 0; banner < small; banner++) numerator += allocation;
    for (let banner = 0; banner < large; banner++) {
      for (let copy = 0; copy < multiplier; copy++) numerator += allocation;
    }
    expect(numerator).toBeGreaterThan(d);
    expect(numerator % d).not.toBe(0);
    return {kind: 'related', num: numerator, den: d};
  }
  expect(q.prompt).toBe("What is the total value of Ethan's coins, in dollars?");
  const reference = match(context[0], /^Nora has (\d+) (\d+)-cent coins\.$/);
  const fraction = match(context[1], /^Ethan has (\d+)\/(\d+) as many (\d+)-cent coins as Nora\.$/);
  const count = Number(reference[1]);
  const denomination = Number(reference[2]);
  const n = Number(fraction[1]);
  const d = Number(fraction[2]);
  expect(Number(fraction[3])).toBe(denomination);
  expect([10, 20, 50]).toContain(denomination);
  expect(count).not.toBe(90);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(d);
  expect(count % d).toBe(0);
  const targetCount = count / d * n;
  expect(Number.isInteger(targetCount)).toBe(true);
  expect(targetCount).toBeGreaterThan(0);
  expect(targetCount).toBeLessThan(count);
  let cents = 0;
  for (let coin = 0; coin < targetCount; coin++) cents += denomination;
  return {kind: 'coins', num: cents, den: 100};
}

function visible(q: Question): VisibleQuestion {
  return {context: q.context, prompt: q.prompt};
}

describe('quantity from rate and count', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const kinds = new Set<Kind>();
    const cases = new Set<string>();
    const seeds = [...Array.from({length: 120}, (_, i) => i - 40), 2147483647, 4294967295];
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const expected = solveVisible(visible(q));
        kinds.add(expected.kind);
        cases.add(JSON.stringify([q.context, q.prompt]));
        expect(same(parseAnswer(q.answer), expected)).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(10);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps?.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.explanation.length).toBeGreaterThan(20);
        const wrong = {...expected, num: expected.num + expected.den};
        expect(correctAnswer(q, asMixed(wrong))).toBe(false);
        if (expected.kind === 'unfinished') {
          expect(q.unit).toBe('kg');
          expect(q.choices).toHaveLength(4);
          const values = q.choices!.map(parseAnswer);
          expect(values.filter(value => same(value, expected))).toHaveLength(1);
          expect(new Set(values.map(value => `${value.num}/${value.den}`)).size).toBe(4);
          expect(values.every(value => value.num > 0 && value.den > 0)).toBe(true);
          expect(q.choices).toContain(q.answer);
          expect(correctAnswer(q, asMixed(expected))).toBe(true);
        } else if (expected.kind === 'related') {
          expect(q.unit).toBe('m');
          expect(q.requireMixed).toBe(true);
          expect(q.requireSimplified).toBe(true);
          expect(q.choices).toBeUndefined();
          expect(q.answer).toBe(asMixed(expected));
          expect(correctAnswer(q, asMixed(expected))).toBe(true);
        } else {
          expect(q.unit).toBe('dollars');
          expect(q.choices).toBeUndefined();
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          expect(correctAnswer(q, (expected.num / expected.den).toFixed(2))).toBe(true);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['coins', 'related', 'unfinished']);
    expect(cases.size).toBeGreaterThan(100);
  });

  it('enforces the required simplified mixed-number response', () => {
    let checked = 0;
    for (let seed = 0; seed < 30; seed++) {
      const q = makeRagQuestion(seed);
      const expected = solveVisible(visible(q));
      if (expected.kind !== 'related') continue;
      const {num, den} = reduce(expected.num, expected.den);
      const whole = Math.floor(num / den);
      const remainder = num % den;
      expect(correctAnswer(q, asMixed(expected))).toBe(true);
      expect(correctAnswer(q, `${num}/${den}`)).toBe(false);
      expect(correctAnswer(q, `${whole} ${remainder * 2}/${den * 2}`)).toBe(false);
      expect(correctAnswer(q, String(num / den))).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('is reproducible and exposes all three variants through successive indices', () => {
    for (const seed of [-19, 0, 17, 1000001]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<Kind>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible(visible(q)).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-quantity-from-rate-and-count');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const permittedSkills = new Set(['P5.S.FRAC.05', 'P5.S.FRAC.07', 'P5.S.RATE.02', 'P4.S.FRAC.03']);
    expect(RAG_PATTERN.skillIds.every(id => permittedSkills.has(id))).toBe(true);
  });
});
