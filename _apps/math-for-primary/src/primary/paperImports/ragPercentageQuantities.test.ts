import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragPercentageQuantities';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  variant: 'complement' | 'equal-share' | 'addition';
  total: number;
  percent: number;
  answers: number[];
  shares?: number;
  added?: number;
};

function numbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given matching ${pattern}`);
  return match.slice(1).map(Number);
}

// This solver receives only pupil-visible prose. It cannot read an answer,
// worked step, key, random state, or internal generation parameter.
function solveVisible(visible: VisibleQuestion): Solution {
  const text = [...(visible.context ?? []), visible.prompt].join(' ');
  if (text.includes('information books')) {
    const [total] = numbers(text, /receives (\d+) new books\./);
    const [percent] = numbers(text, /(\d+)% are storybooks\./);
    const storybooks = total * percent / 100;
    return {variant: 'complement', total, percent, answers: [total - storybooks]};
  }
  if (text.includes('equal pieces')) {
    const [total] = numbers(text, /has (\d+) m of cord\./);
    const [percent, shares] = numbers(text, /cuts (\d+)% of the cord into (\d+) equal pieces/);
    return {
      variant: 'equal-share', total, percent, shares,
      answers: [(total * percent / 100) / shares],
    };
  }
  if (text.includes('star-shaped badges')) {
    const [total] = numbers(text, /makes (\d+) badges for a fair\./);
    const [percent] = numbers(text, /(\d+)% of these badges are star-shaped/);
    const [added] = numbers(text, /then makes (\d+) more star-shaped badges/);
    // Count the unchanged group first, independently of the generator's
    // final-total-minus-final-stars calculation.
    const initialRound = total - total * percent / 100;
    const newTotal = total + added;
    return {
      variant: 'addition', total, percent, added,
      answers: [newTotal - initialRound, initialRound * 100 / newTotal],
    };
  }
  throw new Error('Unrecognised visible question');
}

const seeds = [-2147483648, -17, 0, 2147483647, ...Array.from({length: 96}, (_, i) => i + 1)];
const indices = [0, 1, 2, 7];

describe('percentage quantities candidate', () => {
  test('the independent solver handles three hand-calculated examples', () => {
    expect(solveVisible({
      context: [
        'A school library receives 180 new books.',
        '65% are storybooks. All the other new books are information books.',
      ],
      prompt: 'How many of the new books are information books?',
    }).answers).toEqual([63]);

    expect(solveVisible({
      context: [
        'A craft class has 12 m of cord.',
        'It cuts 40% of the cord into 8 equal pieces, with no waste.',
      ],
      prompt: 'What is the length of each cut piece, in metres?',
    }).answers[0]).toBeCloseTo(0.6, 10);

    expect(solveVisible({
      context: [
        'A class makes 240 badges for a fair.',
        '25% of these badges are star-shaped and the rest are round.',
        'The class then makes 60 more star-shaped badges and no more round badges.',
      ],
      prompt: '(a) How many star-shaped badges are made altogether? (b) What percentage are round?',
    }).answers).toEqual([120, 60]);
  });

  test('answers and units agree with visible givens across 400 seed/index combinations', () => {
    const seen = new Map<string, Set<string>>();
    const keys = new Set<string>();
    for (const seed of seeds) {
      for (const index of indices) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt});
        const signatures = seen.get(solved.variant) ?? new Set<string>();
        signatures.add(JSON.stringify([q.context, q.prompt]));
        seen.set(solved.variant, signatures);
        expect(keys.has(q.key)).toBe(false);
        keys.add(q.key);
        expect(solved.percent).toBeGreaterThan(0);
        expect(solved.percent).toBeLessThan(100);
        expect(Number.isInteger(solved.total)).toBe(true);
        expect(solved.total).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        if (solved.variant === 'addition') {
          expect(q.prompt).toContain('(a)');
          expect(q.prompt).toContain('(b)');
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-fields') throw new Error('Both linked response fields are required');
          expect(spec.fields).toHaveLength(2);
          expect(spec.fields[1].label).toContain('%');
          expect(q.unit).toBeUndefined();
          expect(solved.added).toBeGreaterThan(0);
          expect(solved.answers.every(Number.isInteger)).toBe(true);
          expect(solved.answers[0]).toBeGreaterThan(solved.added!);
          expect(solved.answers[0]).toBeLessThan(solved.total + solved.added!);
          expect(solved.answers[1]).toBeGreaterThan(0);
          expect(solved.answers[1]).toBeLessThan(100 - solved.percent);
          const submitted = JSON.stringify(solved.answers.map(String));
          expect(structuredResponseCorrect(spec, q.answer, submitted)).toBe(true);
          // The old percentage uses the wrong whole after the addition.
          const oldWhole = JSON.stringify([String(solved.answers[0]), String(100 - solved.percent)]);
          expect(structuredResponseCorrect(spec, q.answer, oldWhole)).toBe(false);
          const wrongCount = JSON.stringify([String(solved.answers[0] + 1), String(solved.answers[1])]);
          expect(structuredResponseCorrect(spec, q.answer, wrongCount)).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(solved.answers[0])]))).toBe(false);
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.answer).toMatch(/^\d+(?:\.\d{1,2})?$/);
          expect(Number(q.answer)).toBeCloseTo(solved.answers[0], 9);
          expect(solved.answers[0]).toBeGreaterThan(0);
          if (solved.variant === 'complement') {
            expect(q.unit).toBe('books');
            expect(Number.isInteger(solved.answers[0])).toBe(true);
            expect(solved.answers[0]).toBeLessThan(solved.total);
            expect(solved.answers[0] + solved.total * solved.percent / 100).toBe(solved.total);
          } else {
            expect(q.unit).toBe('m');
            expect(Number.isInteger(solved.shares)).toBe(true);
            expect(solved.shares).toBeGreaterThan(1);
            expect(solved.answers[0]).toBeLessThanOrEqual(3);
            const hundredths = solved.answers[0] * 100;
            expect(hundredths).toBeCloseTo(Math.round(hundredths), 8);
            expect(Number(q.answer) * solved.shares!).toBeCloseTo(solved.total * solved.percent / 100, 9);
          }
        }
      }
    }
    expect([...seen.keys()].sort()).toEqual(['addition', 'complement', 'equal-share']);
    for (const signatures of seen.values()) expect(signatures.size).toBeGreaterThanOrEqual(12);
  });

  test('generation is repeatable and the omitted index means zero', () => {
    for (const seed of [-31, 0, 17, 2048]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 3, 11]) {
        const first = makeRagQuestion(seed, index);
        makeRagQuestion(seed + 1, index + 1);
        expect(makeRagQuestion(seed, index)).toEqual(first);
      }
    }
  });
});
