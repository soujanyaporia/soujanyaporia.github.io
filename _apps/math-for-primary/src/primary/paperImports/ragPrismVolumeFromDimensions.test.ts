import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragPrismVolumeFromDimensions';

// This solver receives only pupil-visible givens, never answers or generation state.
type VisibleQuestion = Pick<Question, 'context' | 'prompt' | 'unit'>;

function solveVisible(q: VisibleQuestion) {
  if (q.unit !== 'litres') throw new Error('Expected an answer in litres');
  const text = [...(q.context ?? []), q.prompt].join('\n');
  const dimensions = /(\d+) cm long, (\d+) cm wide and (\d+) cm high/.exec(text);
  if (!dimensions) throw new Error('Missing visible tank dimensions');
  const length = Number(dimensions[1]);
  const width = Number(dimensions[2]);
  const height = Number(dimensions[3]);
  const depth = /water is (\d+) cm deep/.exec(text);
  const fill = /Water fills (\d+)\/(\d+) of the tank's capacity/.exec(text);
  if (Number(Boolean(depth)) + Number(Boolean(fill)) !== 1) {
    throw new Error('Expected exactly one visible description of the water level');
  }
  const numerator = fill ? Number(fill[1]) : 1;
  const denominator = fill ? Number(fill[2]) : 1;
  // For a rectangular tank, the fraction of capacity equals the fraction of height.
  const waterDepth = depth ? Number(depth[1]) : height * numerator / denominator;
  const waterCm3 = length * width * waterDepth;
  return {
    mode: depth ? 'depth' : 'fraction',
    length, width, height, numerator, denominator, waterDepth, waterCm3,
    capacityCm3: length * width * height,
    answerLitres: waterCm3 / 1000,
  };
}

const seeds = [-37, -1, 0, 1, 2, 7, 29, 101, 512, 8192, 65537, 2147483647];

describe('water volume from tank measurements', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    const depth = solveVisible({
      context: [
        'The inside of a rectangular tank is 50 cm long, 30 cm wide and 45 cm high.',
        'The tank is empty at first. Jo adds water until the water is 12 cm deep.',
      ],
      prompt: 'How many litres of water are in the tank?',
      unit: 'litres',
    });
    expect(depth.answerLitres).toBe(18);
    const fraction = solveVisible({
      context: [
        'The inside of a rectangular tank is 25 cm long, 16 cm wide and 30 cm high.',
        "Water fills 3/5 of the tank's capacity.",
      ],
      prompt: 'How much water is in the tank, in litres?',
      unit: 'litres',
    });
    expect(fraction.waterDepth).toBe(18);
    expect(fraction.answerLitres).toBe(7.2);
  });

  it('independently solves visible givens across seeds and indices', () => {
    const modes = new Set<string>();
    const stems = new Set<string>();
    const fractions = new Set<string>();
    let sawThousandths = false;
    for (const seed of seeds) {
      for (let index = 0; index < 32; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({context: q.context, prompt: q.prompt, unit: q.unit});
        modes.add(solved.mode);
        stems.add(JSON.stringify([q.context, q.prompt]));
        expect(q.answer).toMatch(/^\d+(?:\.\d{1,3})?$/);
        expect(Number(q.answer)).toBeCloseTo(solved.answerLitres, 10);
        expect(solved.length).toBeGreaterThan(0);
        expect(solved.width).toBeGreaterThan(0);
        expect(solved.height).toBeGreaterThan(0);
        expect(solved.waterDepth).toBeGreaterThan(0);
        expect(solved.waterDepth).toBeLessThan(solved.height);
        expect(Number.isInteger(solved.waterCm3)).toBe(true);
        expect(solved.waterCm3).toBeLessThan(solved.capacityCm3);
        expect(q.picture).toBeUndefined();
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
        const equations = (q.workedSteps ?? []).map(step => step.equation ?? '').join('\n');
        expect(equations).toContain(`${solved.waterCm3} ÷ 1000`);
        expect(q.explanation).toContain(`${solved.waterCm3} ÷ 1000`);

        if (solved.mode === 'depth') {
          const choices = q.choices ?? [];
          expect(choices).toHaveLength(4);
          expect(new Set(choices).size).toBe(4);
          expect(choices).toContain(q.answer);
          expect(choices.filter(value => Number(value) === solved.answerLitres)).toHaveLength(1);
          // Check the two distinct misconceptions using visible measurements.
          expect(choices.map(Number).sort((a, b) => a - b)).toEqual([
            solved.answerLitres,
            solved.capacityCm3 / 1000,
            solved.waterCm3,
            solved.capacityCm3,
          ].sort((a, b) => a - b));
        } else {
          expect(q.choices).toBeUndefined();
          expect(q.prompt).toContain('You may use a calculator.');
          expect(solved.numerator).toBeGreaterThan(0);
          expect(solved.numerator).toBeLessThan(solved.denominator);
          expect(solved.denominator).toBeLessThanOrEqual(6);
          expect(solved.capacityCm3 % solved.denominator).toBe(0);
          fractions.add(`${solved.numerator}/${solved.denominator}`);
          if (solved.waterCm3 % 10 !== 0) sawThousandths = true;
        }
      }
    }
    expect([...modes].sort()).toEqual(['depth', 'fraction']);
    expect(stems.size).toBeGreaterThan(80);
    expect(fractions.size).toBeGreaterThan(3);
    expect(sawThousandths).toBe(true);
  });

  it('is repeatable while index changes produce varied questions', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-prism-volume-from-dimensions');
    for (const seed of seeds) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 11)).toEqual(makeRagQuestion(seed, 11));
    }
    const questions = Array.from({length: 32}, (_, index) => makeRagQuestion(29, index));
    expect(new Set(questions.map(q => q.key)).size).toBe(32);
    expect(new Set(questions.map(q => JSON.stringify(q.context))).size).toBeGreaterThan(8);
  });
});
