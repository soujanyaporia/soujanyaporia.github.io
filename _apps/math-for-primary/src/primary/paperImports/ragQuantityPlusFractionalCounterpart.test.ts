import { describe, it, expect } from 'vitest';
import { makeRagQuestion, RAG_PATTERN } from './ragQuantityPlusFractionalCounterpart';
import { structuredResponseCorrect } from './batch6MiddleResponse';

type Fraction = { n: number; d: number };
type Visible = { prompt: string; context?: string[]; unit?: string };
type Solved =
  | { kind: 'walk' | 'mass'; first: Fraction; second: Fraction; factor: Fraction; total: Fraction }
  | { kind: 'sales'; first: number; second: number; factor: Fraction; group: number; total: number; pay: number };

function amount(text: string): Fraction {
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(text);
  if (m) return { n: Number(m[1]) * Number(m[3]) + Number(m[2]), d: Number(m[3]) };
  m = /^(\d+)\/(\d+)$/.exec(text);
  if (m) return { n: Number(m[1]), d: Number(m[2]) };
  m = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!m) throw new Error(`Unrecognised visible number: ${text}`);
  const d = 10 ** (m[2]?.length ?? 0);
  return { n: Number(m[1]) * d + Number(m[2] ?? 0), d };
}

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Missing visible given: ${pattern}`);
  return result;
}

const equal = (a: Fraction, b: Fraction): boolean => a.n * b.d === b.n * a.d;
const value = (a: Fraction): number => a.n / a.d;

// This solver receives only pupil-visible prose and units. It does not receive
// answers, choices, worked solutions, proofs or generator parameters.
function solveVisible(visible: Visible): Solved {
  const text = (visible.context ?? []).join(' ');
  if (visible.unit === 'km' || visible.unit === 'kg') {
    const firstText = visible.unit === 'km'
      ? capture(text, /walks (\d+(?:\.\d+)?) km from a sports hall/)[1]
      : capture(text, /first bag holds (\d+(?: \d+\/\d+)?) kg of rice/)[1];
    const relation = visible.unit === 'km'
      ? capture(text, /playground is (\d+\/\d+) of her walk/)[1]
      : capture(text, /second bag holds (\d+\/\d+) as much rice/)[1];
    const first = amount(firstText);
    const factor = amount(relation);
    const second = { n: first.n * factor.n, d: first.d * factor.d };
    const total = {
      n: first.n * second.d + second.n * first.d,
      d: first.d * second.d,
    };
    return { kind: visible.unit === 'km' ? 'walk' : 'mass', first, second, factor, total };
  }

  if (!visible.prompt.includes('(a)') || !visible.prompt.includes('(b)')) {
    throw new Error('Both linked questions must be visible');
  }
  const first = Number(capture(text, /sold (\d+) key rings in the first week/)[1]);
  const factor = amount(capture(text, /second week, the seller sold (\d+\/\d+) as many/)[1]);
  const rate = Number(capture(text, /each key ring sold, the seller earned \$(\d+)/)[1]);
  const bonusRule = capture(text, /every (\d+) key rings sold in a week, the seller also received a bonus of \$(\d+)/);
  const group = Number(bonusRule[1]);
  const bonus = Number(bonusRule[2]);
  // Independently find an integer count satisfying the stated fraction.
  const matches = Array.from({ length: first }, (_, i) => i + 1)
    .filter(count => count * factor.d === first * factor.n);
  if (matches.length !== 1) throw new Error('Sales do not determine one whole-number count');
  const second = matches[0];
  // Accumulate per-sale payments and award a bonus at each complete group.
  let pay = 0;
  for (let sold = 1; sold <= second; sold++) {
    pay += rate;
    if (sold % group === 0) pay += bonus;
  }
  return { kind: 'sales', first, second, factor, group, total: first + second, pay };
}

const visibleOf = (q: ReturnType<typeof makeRagQuestion>): Visible => ({
  prompt: q.prompt, context: q.context, unit: q.unit,
});

const seeds = [...Array.from({ length: 90 }, (_, i) => i), -11, -1, 2147483647, 4294967295];

describe('quantity plus fractional counterpart', () => {
  it('solves all generated response forms using only visible givens', () => {
    const seen = new Set<string>();
    for (const seed of seeds) {
      for (const index of [0, 1, 2, 11]) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOf(q));
        seen.add(solved.kind);
        expect(solved.factor.n).toBeGreaterThan(0);
        expect(solved.factor.n).toBeLessThan(solved.factor.d);
        expect(solved.factor.d).toBeLessThanOrEqual(8);
        expect(q.hint.length).toBeGreaterThan(15);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.explanation.length).toBeGreaterThan(30);
        expect(q.picture).toBeUndefined();

        if (solved.kind === 'sales') {
          expect(q.structuredResponse?.kind).toBe('number-fields');
          if (q.structuredResponse?.kind !== 'number-fields') throw new Error('Missing linked response');
          expect(q.structuredResponse.fields).toHaveLength(2);
          expect(q.structuredResponse.fields[0].decimal).toBeUndefined();
          expect(q.structuredResponse.fields[1].decimal).toBe(true);
          const expected = JSON.stringify([String(solved.total), solved.pay.toFixed(2)]);
          expect(JSON.parse(q.answer)).toEqual(JSON.parse(expected));
          expect(structuredResponseCorrect(q.structuredResponse, q.answer, expected)).toBe(true);
          expect(structuredResponseCorrect(q.structuredResponse, q.answer,
            JSON.stringify([String(solved.second), String(solved.pay)]))).toBe(false);
          expect(structuredResponseCorrect(q.structuredResponse, q.answer,
            JSON.stringify([String(solved.total), String(solved.pay + 1)]))).toBe(false);
          expect(solved.second % solved.group).toBe(0);
          expect(solved.first).toBeLessThanOrEqual(400);
          expect(solved.total).toBeLessThanOrEqual(700);
          expect(solved.pay).toBeLessThanOrEqual(2000);
          expect(q.workedSteps).toHaveLength(6);
          expect(q.choices).toBeUndefined();
        } else {
          expect(equal(amount(q.answer), solved.total)).toBe(true);
          expect(value(solved.second)).toBeGreaterThan(0);
          expect(value(solved.second)).toBeLessThan(value(solved.first));
          expect(value(solved.total)).toBeGreaterThan(value(solved.first));
          expect(value(solved.total)).toBeLessThan(2 * value(solved.first));
          expect(q.structuredResponse).toBeUndefined();
          if (solved.kind === 'walk') {
            expect(q.choices).toBeUndefined();
            expect(value(solved.first)).toBeLessThan(10);
            expect((solved.second.n * 10) % solved.second.d).toBe(0);
            expect((solved.total.n * 10) % solved.total.d).toBe(0);
            expect(q.workedSteps).toHaveLength(2);
          } else {
            expect(q.choices).toHaveLength(4);
            const options = q.choices!.map(amount);
            expect(options.filter(option => equal(option, solved.total))).toHaveLength(1);
            for (let i = 0; i < options.length; i++) {
              expect(value(options[i])).toBeGreaterThan(0);
              for (let j = 0; j < i; j++) expect(equal(options[i], options[j])).toBe(false);
            }
            expect(value(solved.first)).toBeGreaterThan(1);
            expect(solved.first.n % solved.first.d).not.toBe(0);
            expect(value(solved.first)).toBeLessThan(5);
            // Check a small exact denominator exists without reusing production simplification.
            for (const quantity of [solved.second, solved.total]) {
              expect(Array.from({ length: 12 }, (_, i) => i + 1)
                .some(d => (quantity.n * d) % quantity.d === 0)).toBe(true);
            }
            expect(q.workedSteps).toHaveLength(3);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['mass', 'sales', 'walk']);
  });

  it('checks the independent solver against hand-solvable visible examples', () => {
    const walk = solveVisible({
      unit: 'km', prompt: 'How far does Rina walk altogether?',
      context: [
        'Rina walks 2.8 km from a sports hall to a bakery.',
        'She then walks back along the same path to a playground.',
        'Her walk from the bakery to the playground is 3/4 of her walk from the sports hall to the bakery.',
      ],
    });
    if (walk.kind !== 'walk') throw new Error('Wrong form');
    expect(equal(walk.total, { n: 49, d: 10 })).toBe(true);

    const mass = solveVisible({
      unit: 'kg', prompt: 'What is the total mass?',
      context: ['The first bag holds 2 1/4 kg of rice.', 'The second bag holds 2/3 as much rice as the first bag.'],
    });
    if (mass.kind !== 'mass') throw new Error('Wrong form');
    expect(equal(mass.total, { n: 15, d: 4 })).toBe(true);

    const sales = solveVisible({
      prompt: '(a) Find total sales. (b) Find second-week earnings.',
      context: [
        'A craft seller sold 84 key rings in the first week.',
        'In the second week, the seller sold 3/4 as many key rings as in the first week.',
        'For each key ring sold, the seller earned $4.',
        'For every 7 key rings sold in a week, the seller also received a bonus of $11.',
      ],
    });
    if (sales.kind !== 'sales') throw new Error('Wrong form');
    expect(sales.second).toBe(63);
    expect(sales.total).toBe(147);
    expect(sales.pay).toBe(351);
  });

  it('is reproducible, varies visible givens, and declares one P5 family', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-quantity-plus-fractional-counterpart');
    const permitted = new Set(['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P5.S.FRAC.04', 'P5.S.RATE.02']);
    expect(RAG_PATTERN.skillIds.every(id => permitted.has(id))).toBe(true);
    const contexts = new Set<string>();
    const keys = new Set<string>();
    for (const seed of seeds) {
      const kinds = new Set<string>();
      for (const index of [0, 1, 2]) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        if (index === 0) expect(makeRagQuestion(seed)).toEqual(q);
        contexts.add(JSON.stringify(q.context));
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        kinds.add(solveVisible(visibleOf(q)).kind);
      }
      expect(kinds.size).toBe(3);
    }
    expect(contexts.size).toBeGreaterThan(60);
  });
});
