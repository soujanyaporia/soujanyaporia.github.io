import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragCompositionChanges';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Variant = 'successive' | 'target-addition' | 'remove-then-add';
type Rounding = 'exact' | 'up' | 'down';
interface Solution {
  variant: Variant;
  answers: string[];
  wrongAnswers: string[];
  counts: number[];
  rounding?: Rounding;
}

function read(text: string, expression: RegExp): number[] {
  const match = expression.exec(text);
  if (!match) throw new Error(`Missing visible givens: ${expression}`);
  return match.slice(1).map(Number);
}

function roundedGrowth(increase: number, original: number): {value: string; direction: Rounding} {
  const numerator = increase * 1000;
  const quotient = Math.floor(numerator / original);
  const remainder = numerator - quotient * original;
  const roundUp = 2 * remainder >= original;
  const tenths = quotient + Number(roundUp);
  return {
    value: `${Math.floor(tenths / 10)}.${tenths % 10}`,
    direction: remainder === 0 ? 'exact' : roundUp ? 'up' : 'down',
  };
}

// The oracle receives only pupil-visible prose. It uses simultaneous equations,
// independently of the generator's ratio-unit construction and parameter choices.
function solveVisible(visible: Visible): Solution {
  const text = (visible.context ?? []).join(' ');
  if (text.includes('red and blue counters')) {
    const [firstAdded] = read(text, /first adds (\d+) red counters/);
    const [firstPercent] = read(text, /then make up (\d+)%/);
    const [secondAdded] = read(text, /adds (\d+) more red counters/);
    const [secondPercent] = read(text, /now make up (\d+)%/);
    expect(firstPercent).toBeGreaterThan(secondPercent);
    expect(secondPercent).toBeGreaterThan(0);
    expect(firstPercent).toBeLessThan(100);
    // B = p*T/100 = q*(T + secondAdded)/100.
    const blue = firstPercent * secondPercent * secondAdded / (100 * (firstPercent - secondPercent));
    const firstTotal = 100 * blue / firstPercent;
    const secondTotal = firstTotal + secondAdded;
    const originalTotal = firstTotal - firstAdded;
    const originalRed = originalTotal - blue;
    const added = firstAdded + secondAdded;
    expect(100 * blue).toBe(firstPercent * firstTotal);
    expect(100 * blue).toBe(secondPercent * secondTotal);
    expect(secondTotal - blue).toBe(originalRed + added);
    const growth = roundedGrowth(added, originalRed);
    return {
      variant: 'successive',
      answers: [String(blue), growth.value],
      // A common error is to divide by the original whole instead of the original red count.
      wrongAnswers: [String(blue), roundedGrowth(added, originalTotal).value],
      counts: [blue, firstAdded, secondAdded, originalRed, originalTotal, firstTotal, secondTotal],
      rounding: growth.direction,
    };
  }

  if (text.includes('star stickers')) {
    const [total, before] = read(text, /has (\d+) stickers\. (\d+)% are star stickers/);
    const [after] = read(text, /until (\d+)% of all his stickers/);
    expect(before).toBeGreaterThan(0);
    expect(before).toBeLessThan(50);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(100);
    const stars = total * before / 100;
    const circles = total - stars;
    // 100*(stars + x) = after*(total + x).
    const added = (after * total - 100 * stars) / (100 - after);
    const difference = circles - stars;
    expect(100 * (stars + added)).toBe(after * (total + added));
    expect(total + added - (stars + added)).toBe(circles);
    return {
      variant: 'target-addition',
      answers: [String(difference), String(added)],
      wrongAnswers: [String(difference), String(total * (after - before) / 100)],
      counts: [total, stars, circles, difference, added, total + added],
    };
  }

  if (text.includes('mosaic tiles')) {
    const [total, before] = read(text, /has (\d+) mosaic tiles\. (\d+)% are green/);
    const [removed] = read(text, /takes out (\d+) green tiles/);
    const [after] = read(text, /Green tiles then make up (\d+)%/);
    expect(before).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(before);
    expect(after).toBeLessThan(100);
    const initialGreen = total * before / 100;
    const white = total - initialGreen;
    expect(removed).toBeLessThan(initialGreen);
    const remainingGreen = initialGreen - removed;
    const remainingTotal = total - removed;
    // 100*(remainingGreen + x) = after*(remainingTotal + x).
    const received = (after * remainingTotal - 100 * remainingGreen) / (100 - after);
    const finalTotal = remainingTotal + received;
    expect(100 * (remainingGreen + received)).toBe(after * finalTotal);
    expect(finalTotal - (remainingGreen + received)).toBe(white);
    return {
      variant: 'remove-then-add',
      answers: [String(received)],
      wrongAnswers: [String(received - removed)],
      counts: [total, initialGreen, white, removed, remainingGreen, remainingTotal, received, finalTotal],
    };
  }
  throw new Error('Unrecognised visible question');
}

function visibleOnly(question: Question): Visible {
  return {prompt: question.prompt, context: question.context};
}

describe('composition changes candidate', () => {
  it('checks the independent oracle against hand-calculated examples', () => {
    const successive = solveVisible({
      prompt: 'Find the blue count and percentage growth of red counters.',
      context: [
        'Leela keeps red and blue counters in a box.',
        'She first adds 75 red counters. Blue counters then make up 40% of all the counters.',
        'Next, she adds 150 more red counters. Blue counters now make up 32% of all the counters.',
      ],
    });
    expect(successive.answers).toEqual(['240', '78.9']);
    const addition = solveVisible({
      prompt: 'Find the initial difference and the number added.',
      context: [
        'Arun has 500 stickers. 20% are star stickers and the rest are circle stickers.',
        'He adds only star stickers until 60% of all his stickers are star stickers.',
      ],
    });
    expect(addition.answers).toEqual(['300', '500']);
    const replacement = solveVisible({
      prompt: 'Find the number of green tiles received.',
      context: [
        'Mira has 500 mosaic tiles. 20% are green and the rest are white.',
        'She takes out 35 green tiles for a picture. She then receives some new green tiles.',
        'Green tiles then make up 60% of all her tiles.',
      ],
    });
    expect(replacement.answers).toEqual(['535']);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [...Array.from({length: 80}, (_, i) => i - 20), 2026, 31337, 2147483647, 4294967295];
    const seen = new Set<Variant>();
    const rounding = new Set<Rounding>();
    const wording = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        seen.add(solved.variant);
        if (solved.rounding) rounding.add(solved.rounding);
        wording.add(JSON.stringify(visibleOnly(question)));
        for (const count of solved.counts) {
          expect(Number.isSafeInteger(count)).toBe(true);
          expect(count).toBeGreaterThan(0);
          expect(count).toBeLessThan(10000);
        }
        expect(question.picture).toBeUndefined();
        expect(question.choices).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(6);
        expect(question.explanation).toBe(question.workedSteps?.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join('\n'));

        if (solved.variant === 'remove-then-add') {
          expect(question.structuredResponse).toBeUndefined();
          expect(question.unit).toBe('tiles');
          expect(question.answer).toBe(solved.answers[0]);
          expect(question.answer).not.toBe(solved.wrongAnswers[0]);
        } else {
          const spec = question.structuredResponse;
          if (!spec) throw new Error('Linked parts must have separate answer fields');
          expect(question.prompt).toContain('(a)');
          expect(question.prompt).toContain('(b)');
          expect(question.answer).toBe(JSON.stringify(solved.answers));
          expect(structuredResponseReady(spec, JSON.stringify(solved.answers))).toBe(true);
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(solved.answers))).toBe(true);
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(solved.wrongAnswers))).toBe(false);
          const wrongFirst = [String(Number(solved.answers[0]) + 1), solved.answers[1]];
          expect(structuredResponseCorrect(spec, question.answer, JSON.stringify(wrongFirst))).toBe(false);
          if (solved.variant === 'successive') {
            expect(question.prompt).toContain('1 decimal place');
            expect(solved.answers[1]).toMatch(/^\d+\.\d$/);
            if (spec.kind !== 'number-fields') throw new Error('Mixed count and percentage need number-fields');
            expect(spec.fields).toHaveLength(2);
            expect(Boolean(spec.fields[0].decimal)).toBe(false);
            expect(spec.fields[1].decimal).toBe(true);
            const fractionalCount = [String(Number(solved.answers[0]) + 0.5), solved.answers[1]];
            expect(structuredResponseReady(spec, JSON.stringify(fractionalCount))).toBe(false);
          } else {
            expect(spec.kind).toBe('number-pair');
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['remove-then-add', 'successive', 'target-addition']);
    expect([...rounding].sort()).toEqual(['down', 'exact', 'up']);
    expect(wording.size).toBeGreaterThan(100);
  });

  it('is reproducible and cycles all three templates for each seed', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-composition-changed-by-additions-or-removals');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const allowedSkills = new Set(['P6.S.PCT.01', 'P6.S.PCT.02', 'P5.S.PCT.03']);
    expect(RAG_PATTERN.skillIds.every(id => allowedSkills.has(id))).toBe(true);
    for (const seed of [-19, 0, 7, 2026, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const variants = new Set<Variant>();
      for (let index = 0; index < 3; index++) {
        const first = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        variants.add(solveVisible(visibleOnly(first)).variant);
      }
      expect(variants.size).toBe(3);
    }
  });
});
