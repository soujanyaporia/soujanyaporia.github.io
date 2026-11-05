import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragCubeTankFractionDepth';

// This solver receives only pupil-visible text, never answers or generation parameters.
function solveVisible(visible: Pick<Question, 'context' | 'prompt'>) {
  const text = [...(visible.context ?? []), visible.prompt].join(' ');
  const sideMatch = /Every inside edge of Tank P is (\d+) cm long\./.exec(text);
  const fractionMatch = /(\d+)\/(\d+) of the water originally in Tank P/.exec(text);
  const ratioMatch = /water depth in Tank P : the water depth in Tank Q is (\d+) : (\d+)\./.exec(text);
  if (!sideMatch || !fractionMatch || !ratioMatch ||
      !text.includes('each have a cube-shaped interior') ||
      !text.includes('Tank P is full of water and Tank Q is empty') ||
      !text.includes('none is spilled')) {
    throw new Error('Missing visible tank givens');
  }
  const side = Number(sideMatch[1]);
  const numerator = Number(fractionMatch[1]);
  const denominator = Number(fractionMatch[2]);
  const ratioP = Number(ratioMatch[1]);
  const ratioQ = Number(ratioMatch[2]);
  const initial = side ** 3;
  const moved = initial * numerator / denominator;
  const remaining = initial - moved;
  const depthP = remaining / (side * side);
  const depthQ = depthP * ratioQ / ratioP;
  // Independently invert the visible ratio to recover the unknown square base.
  const areaNumerator = side * side * numerator * ratioP;
  const areaDenominator = (denominator - numerator) * ratioQ;
  const baseAreaQ = areaNumerator / areaDenominator;
  const edgeQ = Math.sqrt(baseAreaQ);
  return {
    side, numerator, denominator, ratioP, ratioQ, initial, moved,
    remaining, depthP, depthQ, areaNumerator, areaDenominator,
    baseAreaQ, edgeQ,
  };
}

function visibleOnly(q: Question): Pick<Question, 'context' | 'prompt'> {
  return {context: q.context, prompt: q.prompt};
}

function responseSpec(q: Question) {
  if (!q.structuredResponse || q.structuredResponse.kind !== 'number-fields') {
    throw new Error('Both linked responses must use supported number fields');
  }
  return q.structuredResponse;
}

describe('cube tank fraction and depth ratio', () => {
  it('anchors the independent solver with a smaller receiving cube and a half-centimetre depth', () => {
    const solved = solveVisible({
      context: [
        'Tank P and Tank Q each have a cube-shaped interior. Every inside edge of Tank P is 24 cm long.',
        'At first, Tank P is full of water and Tank Q is empty.',
        '1/4 of the water originally in Tank P is poured into Tank Q. All this water fits in Tank Q, and none is spilled.',
        'After the transfer, the water depth in Tank P : the water depth in Tank Q is 4 : 3.',
      ],
      prompt: 'Find the transferred volume and the inside edge length of Tank Q.',
    });
    expect(solved.moved).toBe(3456);
    expect(solved.depthP).toBe(18);
    expect(solved.depthQ).toBe(13.5);
    expect(solved.baseAreaQ).toBe(256);
    expect(solved.edgeQ).toBe(16);
  });

  it('solves both responses from visible givens across varied seeds and indices', () => {
    const signatures = new Set<string>();
    const fractions = new Set<string>();
    const ratios = new Set<string>();
    let sawSmallerReceiver = false;
    let sawLargerReceiver = false;
    let sawNonIntegerDepth = false;

    for (let seed = -64; seed < 64; seed++) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(q));
        const spec = responseSpec(q);
        const expected = JSON.stringify([String(solved.moved), String(solved.edgeQ)]);

        expect(solved.numerator).toBeGreaterThan(0);
        expect(solved.numerator).toBeLessThan(solved.denominator);
        expect(solved.ratioP).toBeGreaterThan(0);
        expect(solved.ratioQ).toBeGreaterThan(0);
        expect(solved.side).toBeGreaterThanOrEqual(12);
        expect(solved.side).toBeLessThanOrEqual(72);
        expect(solved.side).not.toBe(30);
        expect(solved.numerator * 5).not.toBe(solved.denominator * 2);
        expect(solved.ratioP * 3).not.toBe(solved.ratioQ * 8);
        expect(Number.isSafeInteger(solved.moved)).toBe(true);
        expect(solved.areaNumerator % solved.areaDenominator).toBe(0);
        expect(Number.isSafeInteger(solved.edgeQ)).toBe(true);
        expect(solved.edgeQ * solved.edgeQ).toBe(solved.baseAreaQ);
        expect(solved.moved + solved.remaining).toBe(solved.initial);
        expect(solved.depthP).toBeGreaterThan(0);
        expect(solved.depthP).toBeLessThan(solved.side);
        expect(solved.depthQ).toBeGreaterThan(0);
        expect(solved.depthQ).toBeLessThanOrEqual(solved.edgeQ);
        expect(solved.moved).toBeLessThanOrEqual(solved.edgeQ ** 3);
        expect(solved.baseAreaQ * solved.depthQ).toBeCloseTo(solved.moved, 8);
        expect(solved.depthP / solved.depthQ).toBeCloseTo(solved.ratioP / solved.ratioQ, 10);
        expect(JSON.parse(q.answer)).toEqual([String(solved.moved), String(solved.edgeQ)]);
        expect(structuredResponseReady(spec, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(spec.fields.map(field => field.label)).toEqual([
          '(a) Water moved (cm³)',
          '(b) Inside edge length of Tank Q (cm)',
        ]);
        expect(q.picture).toBeUndefined();

        signatures.add(JSON.stringify(q.context));
        fractions.add(`${solved.numerator}/${solved.denominator}`);
        ratios.add(`${solved.ratioP}:${solved.ratioQ}`);
        sawSmallerReceiver ||= solved.edgeQ < solved.side;
        sawLargerReceiver ||= solved.edgeQ > solved.side;
        sawNonIntegerDepth ||= !Number.isInteger(solved.depthQ);
      }
    }
    expect(signatures.size).toBeGreaterThanOrEqual(18);
    expect(fractions.size).toBeGreaterThanOrEqual(5);
    expect(ratios.size).toBeGreaterThanOrEqual(6);
    expect(sawSmallerReceiver).toBe(true);
    expect(sawLargerReceiver).toBe(true);
    expect(sawNonIntegerDepth).toBe(true);
  });

  it('requires both answers in their labelled order and rejects wrong values', () => {
    for (const seed of [-20, 0, 11, 2026]) {
      const q = makeRagQuestion(seed, 2);
      const solved = solveVisible(visibleOnly(q));
      const spec = responseSpec(q);
      const volume = String(solved.moved);
      const edge = String(solved.edgeQ);
      for (const wrong of [
        JSON.stringify([edge, volume]),
        JSON.stringify([String(solved.moved + 1), edge]),
        JSON.stringify([volume, String(solved.edgeQ + 1)]),
        JSON.stringify([volume]),
        JSON.stringify([volume, '']),
      ]) {
        expect(structuredResponseCorrect(spec, q.answer, wrong)).toBe(false);
      }
    }
  });

  it('is reproducible for the same seed and index and supplies a worked dependency chain', () => {
    for (const seed of [-2026, 0, 37, 2147483647]) {
      const first = makeRagQuestion(seed);
      expect(makeRagQuestion(seed, 0)).toEqual(first);
      expect(makeRagQuestion(seed, 1)).toEqual(makeRagQuestion(seed, 1));
      expect(makeRagQuestion(seed, 1).key).not.toBe(first.key);
      expect(first.hint).toContain('ratio compares water depths');
      expect(first.workedSteps?.some(step => step.text.includes('amount found in part (a)'))).toBe(true);
      expect(first.workedSteps?.some(step => step.text.includes('base of Tank Q is a square'))).toBe(true);
      expect(first.explanation).toContain('cm³');
      expect(first.explanation).toContain('cm²');
    }
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('cubical-tanks-fraction-transfer-depth-ratio-missing-edge');
  });
});
