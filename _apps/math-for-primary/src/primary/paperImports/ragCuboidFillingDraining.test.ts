import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragCuboidFillingDraining';

type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'rounded-drain' | 'empty-fill' | 'linked-fill';
  answer: string;
  capacityMl: number;
  movedMl: number;
  rate: number;
  minutesNumerator: number;
  minutesDenominator: number;
  dimensions: number[];
};

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1).map(Number);
}

// Integer remainder arithmetic independently rounds the rational duration.
function roundedTenth(numerator: number, denominator: number): string {
  const below = Math.floor(numerator * 10 / denominator);
  const remainder = numerator * 10 - below * denominator;
  const tenths = below + (2 * remainder >= denominator ? 1 : 0);
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}

// This solver receives only pupil-visible text. It cannot read answers,
// worked steps, seeds, or the generator's dimension tables.
function solveVisible(visible: Visible): Solution {
  const text = (visible.context ?? []).join(' ');
  if (text.includes('half full of water')) {
    const [depth] = readNumbers(text, /water is (\d+) cm deep/);
    const [wn, wd] = readNumbers(text, /inside width is (\d+)\/(\d+) of the tank's full inside height/);
    const [ln, ld] = readNumbers(text, /inside length is (\d+)\/(\d+) of its inside width/);
    const [rate] = readNumbers(text, /rate of (\d+) L per minute/);
    const height = depth * 2;
    const width = height * wn / wd;
    const length = width * ln / ld;
    const capacityMl = height * width * length;
    const movedMl = capacityMl / 2;
    return {
      kind: 'linked-fill',
      answer: JSON.stringify([String(capacityMl / 1000), String(movedMl / (1000 * rate))]),
      capacityMl, movedMl, rate,
      minutesNumerator: movedMl, minutesDenominator: 1000 * rate,
      dimensions: [length, width, height],
    };
  }
  const [length, width, height] = readNumbers(text, /measures (\d+) cm by (\d+) cm by (\d+) cm/);
  const capacityMl = length * width * height;
  if (text.includes('Water drains out')) {
    const [n, d] = readNumbers(text, /tank is (\d+)\/(\d+) full of water/);
    if (!(n > 0 && n < d)) throw new Error('Starting fraction must be proper and positive.');
    const [rate] = readNumbers(text, /rate of (\d+) ml per second/);
    const movedMl = capacityMl * n / d;
    return {
      kind: 'rounded-drain', answer: roundedTenth(movedMl, 60 * rate),
      capacityMl, movedMl, rate,
      minutesNumerator: movedMl, minutesDenominator: 60 * rate,
      dimensions: [length, width, height],
    };
  }
  if (!text.includes('empty rectangular tank')) throw new Error('Missing initial state.');
  const [rate] = readNumbers(text, /rate of (\d+) L per minute/);
  return {
    kind: 'empty-fill', answer: String(capacityMl / (1000 * rate)),
    capacityMl, movedMl: capacityMl, rate,
    minutesNumerator: capacityMl, minutesDenominator: 1000 * rate,
    dimensions: [length, width, height],
  };
}

const visibleOnly = (q: Question): Visible => ({context: q.context, prompt: q.prompt});

function drainExample(rate: number): Visible {
  return {
    context: [
      'The inside of a rectangular tank measures 28 cm by 25 cm by 18 cm.',
      'The tank is 1/4 full of water.',
      `Water drains out at a steady rate of ${rate} ml per second. No water enters the tank.`,
    ],
    prompt: 'How many minutes will it take to empty the tank? Give your answer correct to 1 decimal place.',
  };
}

describe('cuboid filling and draining candidate', () => {
  test('independent solver handles known conversions, rounding and linked dimensions', () => {
    // 3150 ml at 14 ml/s takes 225 s = 3.75 min.
    expect(solveVisible(drainExample(14)).answer).toBe('3.8');
    expect(solveVisible(drainExample(13)).answer).toBe('4.0');
    expect(solveVisible(drainExample(11)).answer).toBe('4.8');
    expect(solveVisible({
      context: [
        'The inside of an empty rectangular tank measures 45 cm by 20 cm by 24 cm.',
        'A tap adds water at a steady rate of 3 L per minute. No water leaves the tank.',
      ],
      prompt: 'How many minutes does the tap take to fill the tank?',
    }).answer).toBe('7.2');
    expect(solveVisible({
      context: [
        'A rectangular tank is half full of water. The water is 12 cm deep.',
        `The inside width is 5/4 of the tank's full inside height. The inside length is 4/3 of its inside width.`,
        'A tap adds water at a steady rate of 8 L per minute. No water leaves the tank.',
      ],
      prompt: '(a) Find the capacity in litres. (b) Find the remaining filling time in minutes.',
    }).answer).toBe(JSON.stringify(['28.8', '1.8']));
  });

  test('solves generated visible givens across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const fingerprints = new Set<string>();
    let roundedUp = 0;
    let roundedDown = 0;
    for (let seed = -32; seed < 128; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(q));
        kinds.add(solved.kind);
        fingerprints.add(JSON.stringify([q.context, q.prompt]));
        expect(q.answer).toBe(solved.answer);
        expect(solved.dimensions.every(value => Number.isInteger(value) && value > 0 && value <= 100)).toBe(true);
        expect(Number.isInteger(solved.movedMl)).toBe(true);
        expect(solved.rate).toBeGreaterThan(0);
        expect(solved.movedMl).toBeGreaterThan(0);
        expect(solved.movedMl).toBeLessThanOrEqual(solved.capacityMl);
        expect(q.picture).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(40);
        expect((q.workedSteps ?? []).length).toBeGreaterThanOrEqual(3);
        const equations = (q.workedSteps ?? []).map(step => step.equation ?? '').join(' ');
        expect(equations).toContain(`${solved.capacityMl} cm³`);
        const minutes = solved.minutesNumerator / solved.minutesDenominator;
        if (solved.kind === 'rounded-drain') {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('min');
          expect(q.prompt).toContain('1 decimal place');
          expect(q.answer).toMatch(/^\d+\.\d$/);
          expect(solved.movedMl).toBeLessThan(solved.capacityMl);
          expect((solved.minutesNumerator * 10) % solved.minutesDenominator).not.toBe(0);
          expect(Math.abs(Number(q.answer) - minutes)).toBeLessThanOrEqual(0.050000001);
          if (Number(q.answer) > minutes) roundedUp++;
          if (Number(q.answer) < minutes) roundedDown++;
        } else {
          expect((solved.minutesNumerator * 10) % solved.minutesDenominator).toBe(0);
          expect(minutes).toBeGreaterThanOrEqual(0.5);
          expect(minutes).toBeLessThanOrEqual(60);
          if (solved.kind === 'linked-fill') {
            expect(solved.movedMl * 2).toBe(solved.capacityMl);
            expect(q.structuredResponse).toEqual({
              kind: 'number-pair', firstLabel: '(a) Capacity (L)', secondLabel: '(b) Time (min)', decimal: true,
            });
            expect(q.prompt).toContain('(a)');
            expect(q.prompt).toContain('(b)');
            expect(q.unit).toBeUndefined();
          } else {
            expect(solved.movedMl).toBe(solved.capacityMl);
            expect(q.unit).toBe('min');
            expect(q.structuredResponse).toBeUndefined();
          }
        }
      }
    }
    expect([...kinds].sort()).toEqual(['empty-fill', 'linked-fill', 'rounded-drain']);
    expect(fingerprints.size).toBeGreaterThan(100);
    expect(roundedUp).toBeGreaterThan(0);
    expect(roundedDown).toBeGreaterThan(0);
  });

  test('is deterministic and includes all three variants in each three-question sequence', () => {
    for (const seed of [-2147483648, -7, 0, 19, 8521, 2147483647]) {
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible(visibleOnly(q)).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
    }
    expect(makeRagQuestion(7)).toEqual(makeRagQuestion(7, 0));
  });

  test('declares the intended P5 family and existing curriculum skills', () => {
    const allowed = new Set(['P5.S.VOL.03', 'P5.S.VOL.04', 'P5.S.VOL.05', 'P5.S.FRAC.05', 'P5.S.RATE.02', 'P5.S.DEC.02']);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-cuboid-filling-and-draining');
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
    expect(() => makeRagQuestion(NaN)).toThrow(RangeError);
    expect(() => makeRagQuestion(1, 0.5)).toThrow(RangeError);
  });
});
