import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragReverseNestedFractions';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solved = {
  kind: 'balance' | 'priced' | 'badges';
  answer: string;
  unit: 'dollars' | 'badges';
  whole: number;
  quantities: number[];
  fractions: [number, number][];
};

function find(pattern: RegExp, text: string): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern} in ${text}`);
  return match;
}
function readFraction(text: string): [number, number] {
  const match = find(/([0-9]+)[/]([0-9]+)/, text);
  return [Number(match[1]), Number(match[2])];
}
function readCents(text: string): number {
  const match = find(/[$]([0-9]+)[.]([0-9]{2})/, text);
  return Number(match[1]) * 100 + Number(match[2]);
}
function exactDivide(numerator: number, denominator: number): number {
  if (denominator <= 0 || numerator % denominator !== 0) {
    throw new Error('The visible givens do not give an exact whole-number amount.');
  }
  return numerator / denominator;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// This solver receives only the visible prompt and context. It does not import
// generation cases, inspect answers, or use worked solutions or private data.
function solveVisible(q: Visible): Solved {
  const lines = q.context ?? [];
  if (q.prompt.includes('paint set')) {
    const [a, b] = readFraction(lines[0]);
    const [c, d] = readFraction(lines[1]);
    const left = readCents(lines[2]);
    const whole = exactDivide(left * b * d, (b - a) * (d - c));
    const first = exactDivide(whole * a, b);
    const second = exactDivide((whole - first) * c, d);
    if (whole - first - second !== left) throw new Error('Balance does not reconcile.');
    return {
      kind: 'balance', answer: ((whole - left) / 100).toFixed(2), unit: 'dollars', whole,
      quantities: [whole, first, second, left, whole - left], fractions: [[a, b], [c, d]],
    };
  }
  if (q.prompt.includes('cord')) {
    const metres = Number(find(/bought ([0-9]+) m/, lines[0])[1]);
    const price = readCents(lines[0]);
    const [a, b] = readFraction(lines[1]);
    const [c, d] = readFraction(lines[2]);
    const first = metres * price;
    const whole = exactDivide(first * b, a);
    const second = exactDivide((whole - first) * c, d);
    const left = whole - first - second;
    return {
      kind: 'priced', answer: ((first + second) / 100).toFixed(2), unit: 'dollars', whole,
      quantities: [metres, price, first, whole, second, left], fractions: [[a, b], [c, d]],
    };
  }
  if (!q.prompt.includes('badges')) throw new Error('Unrecognised visible question.');
  const [a, b] = readFraction(lines[1]);
  const [c, d] = readFraction(lines[2]);
  const yellow = Number(find(/other ([0-9]+) badges were yellow/, lines[2])[1]);
  const [e, f] = readFraction(lines[4]);
  if (!lines[3].includes('No blue or yellow badges were sold, and no badges were added.')) {
    throw new Error('The unchanged group must be explicit.');
  }
  const possibilities: {whole: number; red: number; blue: number; sold: number}[] = [];
  // Independently enumerate whole collections and sales. Check each visible
  // fraction by cross-multiplication, including the changed denominator.
  for (let whole = 1; whole <= 1000; whole++) {
    if ((whole * a) % b !== 0) continue;
    const red = whole * a / b;
    const other = whole - red;
    if ((other * c) % d !== 0) continue;
    const blue = other * c / d;
    if (other - blue !== yellow) continue;
    for (let sold = 1; sold < red; sold++) {
      if ((red - sold) * f === (whole - sold) * e) {
        possibilities.push({whole, red, blue, sold});
      }
    }
  }
  if (possibilities.length !== 1) throw new Error('Expected one feasible pair of badge answers.');
  const {whole, red, blue, sold} = possibilities[0];
  return {
    kind: 'badges', answer: JSON.stringify([String(red), String(sold)]), unit: 'badges', whole,
    quantities: [whole, red, blue, yellow, sold, red - sold, whole - sold],
    fractions: [[a, b], [c, d], [e, f]],
  };
}

const seeds = [
  -2147483648, -17, -1, 0, 1, 2, 42, 2147483647,
  ...Array.from({length: 72}, (_, i) => (i + 1) * 7919),
];

describe('reverse nested fractions candidate', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    expect(solveVisible({
      prompt: 'Find spending on the paint set and craft kit.',
      context: [
        'A pupil used 1/4 of her money on a paint set.',
        'She used 2/3 of the remaining money on a craft kit.',
        'She had $18.00 left.',
      ],
    }).answer).toBe('54.00');
    expect(solveVisible({
      prompt: 'Find the total paid for cord.',
      context: [
        'A pupil bought 6 m of cord at $1.25 per metre.',
        'The first cost was 2/5 of the starting money.',
        'The next purchase used 1/3 of the remaining money.',
      ],
    }).answer).toBe('11.25');
    expect(solveVisible({
      prompt: 'Find both answers about badges.',
      context: [
        'There are three badge colours.',
        'At first, 2/5 of the badges were red.',
        'Of the non-red badges, 1/4 were blue. The other 81 badges were yellow.',
        'No blue or yellow badges were sold, and no badges were added.',
        'After the sale, 1/4 of the remaining badges were red.',
      ],
    }).answer).toBe('["72","36"]');
  });

  it('solves visible givens across varied seeds and indexes with exact, bounded quantities', () => {
    const seen = {balance: new Set<string>(), priced: new Set<string>(), badges: new Set<string>()};
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        expect(q.answer).toBe(solved.answer);
        expect(q.unit).toBe(solved.unit);
        expect(solved.quantities.every(value => Number.isSafeInteger(value) && value > 0)).toBe(true);
        for (const [numerator, denominator] of solved.fractions) {
          expect(numerator).toBeGreaterThan(0);
          expect(numerator).toBeLessThan(denominator);
          expect(denominator).toBeLessThanOrEqual(12);
          expect(gcd(numerator, denominator)).toBe(1);
        }
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.workedSteps?.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.explanation).toBe(q.workedSteps?.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '));
        if (solved.kind === 'balance') {
          expect(solved.whole).toBeLessThanOrEqual(42000);
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(choice => choice === solved.answer)).toHaveLength(1);
          expect(q.choices?.every(choice => /^[0-9]+[.][0-9]{2}$/.test(choice) && Number(choice) > 0)).toBe(true);
          expect(q.structuredResponse).toBeUndefined();
        } else if (solved.kind === 'priced') {
          expect(solved.whole).toBeLessThanOrEqual(15000);
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse).toBeUndefined();
        } else {
          expect(solved.whole).toBeLessThanOrEqual(672);
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse).toEqual({
            kind: 'number-pair',
            firstLabel: '(a) Red badges before the sale',
            secondLabel: '(b) Red badges sold',
          });
        }
        seen[solved.kind].add(JSON.stringify(q.context));
      }
    }
    for (const variants of Object.values(seen)) expect(variants.size).toBeGreaterThan(10);
  });

  it('grades both linked answers in order and rejects partial or incorrect responses', () => {
    const q = makeRagQuestion(0, 2);
    const solved = solveVisible({prompt: q.prompt, context: q.context});
    const spec = q.structuredResponse;
    if (!spec) throw new Error('Expected the supported linked response control.');
    const answers = JSON.parse(solved.answer) as string[];
    expect(structuredResponseCorrect(spec, q.answer, solved.answer)).toBe(true);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...answers].reverse()))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([answers[0]]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([answers[0], String(Number(answers[1]) + 1)]))).toBe(false);
    expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(Number(answers[0]) + 1), answers[1]]))).toBe(false);
  });

  it('is reproducible, uses distinct keys, and cycles through all three variants', () => {
    const keys = new Set<string>();
    for (const seed of seeds.slice(0, 12)) {
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        kinds.add(solveVisible({prompt: q.prompt, context: q.context}).kind);
      }
      expect([...kinds].sort()).toEqual(['badges', 'balance', 'priced']);
    }
    expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  });

  it('declares the expected P5 family and uses supplied curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-reverse-nested-fractions-and-remainders');
    const permitted = new Set(['P4.S.FRAC.03', 'P5.S.FRAC.05', 'P5.S.FRAC.06', 'P5.S.RATE.02']);
    expect(RAG_PATTERN.skillIds.every(id => permitted.has(id))).toBe(true);
    expect(new Set(RAG_PATTERN.skillIds).size).toBe(RAG_PATTERN.skillIds.length);
  });
});
