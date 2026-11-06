import {describe, expect, it} from 'vitest';
import {correctAnswer, type Question} from '../generate';
import {responseReady} from '../answerFormat';
import {makeRagQuestion, RAG_PATTERN} from './ragDifferenceContainerVolumes';

function requireMatch(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Missing visible given matching ${pattern.source}`);
  return result;
}

// This solver accepts only pupil-visible text. Answers, worked steps, keys and
// generation parameters are unavailable to it.
function solveVisible(question: Pick<Question, 'prompt' | 'context'>) {
  const text = (question.context ?? []).join('\n');
  const dimensionsA = requireMatch(text, /Tank A is a cuboid\. Its inside length is (\d+) cm, width is (\d+) cm and height is (\d+) cm\./).slice(1).map(Number);
  const cube = /Tank B is a cube with an inside edge length of (\d+) cm\./.exec(text);
  const square = /Tank B is a cuboid with a square base\. Each inside base edge is (\d+) cm and its inside height is (\d+) cm\./.exec(text);
  let dimensionsB: number[];
  let shape: string;
  if (cube) {
    dimensionsB = [Number(cube[1]), Number(cube[1]), Number(cube[1])];
    shape = 'cube';
  } else if (square) {
    dimensionsB = [Number(square[1]), Number(square[1]), Number(square[2])];
    shape = 'square-base';
  } else {
    dimensionsB = requireMatch(text, /Tank B is a cuboid\. Its inside length is (\d+) cm, width is (\d+) cm and height is (\d+) cm\./).slice(1).map(Number);
    shape = 'cuboid';
  }
  const initialFill = requireMatch(text, /Tank A starts (?:(\d+)\/(\d+) )?full of water\./);
  const finalFill = requireMatch(text, /until Tank B is (?:(\d+)\/(\d+) )?full\./);
  const numeratorA = Number(initialFill[1] ?? 1);
  const denominatorA = Number(initialFill[2] ?? 1);
  const numeratorB = Number(finalFill[1] ?? 1);
  const denominatorB = Number(finalFill[2] ?? 1);
  const capacityA = dimensionsA.reduce((volume, dimension) => volume * dimension, 1);
  const capacityB = dimensionsB.reduce((volume, dimension) => volume * dimension, 1);
  const initialWater = capacityA * numeratorA / denominatorA;
  const transferredWater = capacityB * numeratorB / denominatorB;
  const remaining = initialWater - transferredWater;

  let response: 'linked' | 'compound' | 'cubic';
  let values: string[];
  if (question.prompt.startsWith('(a)')) {
    response = 'linked';
    values = [String(capacityB), String(remaining / 1000)];
  } else if (question.prompt.includes('litres and millilitres')) {
    response = 'compound';
    const millilitres = remaining % 1000;
    values = [String((remaining - millilitres) / 1000), String(millilitres)];
  } else {
    if (!question.prompt.includes('in cm³')) throw new Error('Unknown visible response unit');
    response = 'cubic';
    values = [String(remaining)];
  }
  return {
    dimensionsA, dimensionsB, shape, capacityA, capacityB,
    numeratorA, denominatorA, numeratorB, denominatorB,
    initialWater, transferredWater, remaining, response, values,
    expectedAnswer: response === 'cubic' ? values[0] : JSON.stringify(values),
  };
}

const seeds = [-2147483648, -31, -1, 0, 0.5, 2147483647, ...Array.from({length: 96}, (_, i) => i + 1)];

describe('difference of container volumes', () => {
  it('solves visible givens across varied seeds and indices with feasible exact transfers', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: question.prompt, context: question.context});
        expect(question.answer).toBe(solved.expectedAnswer);
        expect(solved.initialWater).toBeLessThanOrEqual(solved.capacityA);
        expect(solved.transferredWater).toBeLessThanOrEqual(solved.capacityB);
        expect(solved.transferredWater).toBeGreaterThan(0);
        expect(solved.remaining).toBeGreaterThan(0);
        expect(solved.remaining + solved.transferredWater).toBe(solved.initialWater);
        for (const amount of [solved.capacityA, solved.capacityB, solved.initialWater, solved.transferredWater, solved.remaining]) {
          expect(Number.isSafeInteger(amount)).toBe(true);
        }
        for (const dimension of [...solved.dimensionsA, ...solved.dimensionsB]) {
          expect(Number.isInteger(dimension)).toBe(true);
          expect(dimension).toBeGreaterThan(0);
          expect(dimension).toBeLessThanOrEqual(100);
        }
        const visibleText = question.context?.join(' ') ?? '';
        expect(visibleText).toContain('Tank B starts empty.');
        expect(visibleText).toContain('No water is spilled.');
        expect(question.workedSteps?.map(step => step.equation)).toContain(
          `${solved.initialWater} − ${solved.transferredWater} = ${solved.remaining} cm³`,
        );
        expect(question.workedSteps?.map(step => step.equation)).toContain(
          `${solved.dimensionsB.join(' × ')} = ${solved.capacityB} cm³`,
        );
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation).toContain(`${solved.remaining} cm³`);
        if (solved.response === 'compound') {
          expect(Number(solved.values[0])).toBeGreaterThanOrEqual(0);
          expect(Number(solved.values[1])).toBeGreaterThanOrEqual(0);
          expect(Number(solved.values[1])).toBeLessThan(1000);
          expect(Number(solved.values[0]) * 1000 + Number(solved.values[1])).toBe(solved.remaining);
        }
      }
    }
  });

  it('exercises all four visible variants and both square-base response requirements', () => {
    const variants = new Set<string>();
    const squareResponses = new Set<string>();
    const compoundRemainders = new Set<number>();
    let hasDecimalLitres = false;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(question);
        const variant = solved.denominatorB > 1 ? 'fractional-receiver' : solved.shape;
        variants.add(variant);
        if (solved.shape === 'square-base') squareResponses.add(solved.response);
        if (solved.response === 'compound') compoundRemainders.add(Number(solved.values[1]));
        if (solved.response === 'linked' && solved.remaining % 1000 !== 0) hasDecimalLitres = true;
      }
    }
    expect([...variants].sort()).toEqual(['cube', 'cuboid', 'fractional-receiver', 'square-base']);
    expect([...squareResponses].sort()).toEqual(['compound', 'linked']);
    expect([...compoundRemainders].some(value => value > 0)).toBe(true);
    expect(hasDecimalLitres).toBe(true);
  });

  it('uses supported controls and grades independently calculated responses', () => {
    for (const seed of [2, 17, 59, 101]) {
      for (let index = 0; index < 8; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(question);
        expect(responseReady(question, solved.expectedAnswer)).toBe(true);
        expect(correctAnswer(question, solved.expectedAnswer)).toBe(true);
        if (solved.response === 'cubic') {
          expect(question.structuredResponse).toBeUndefined();
          expect(question.unit).toBe('cm³');
          expect(correctAnswer(question, String(solved.remaining + 1))).toBe(false);
        } else {
          const wrong = [...solved.values];
          wrong[wrong.length - 1] = String(Number(wrong[wrong.length - 1]) + 1);
          expect(correctAnswer(question, JSON.stringify(wrong))).toBe(false);
          expect(responseReady(question, JSON.stringify([solved.values[0], '']))).toBe(false);
          expect(responseReady(question, JSON.stringify([solved.values[0]]))).toBe(false);
          if (solved.response === 'linked') {
            expect(question.structuredResponse).toEqual({
              kind: 'number-fields',
              fields: [
                {label: '(a) Capacity of Tank B (cm³)'},
                {label: '(b) Water left in Tank A (litres)', decimal: true},
              ],
            });
          } else {
            expect(question.structuredResponse).toEqual({
              kind: 'number-pair', firstLabel: 'Litres', secondLabel: 'Millilitres',
            });
            expect(correctAnswer(question, JSON.stringify([solved.values[0], '1000']))).toBe(false);
          }
        }
      }
    }
  });

  it('is deterministic and identifies the requested P5 family', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-difference-of-container-volumes');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of [-3, 0, 11, 101]) {
      for (let index = 0; index < 8; index += 1) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
    expect(makeRagQuestion(9)).toEqual(makeRagQuestion(9, 0));
    const questions = Array.from({length: 8}, (_, index) => makeRagQuestion(9, index));
    expect(new Set(questions.map(question => question.key)).size).toBe(8);
    expect(new Set(questions.map(question => JSON.stringify([question.prompt, question.context]))).size).toBeGreaterThan(1);
  });
});
