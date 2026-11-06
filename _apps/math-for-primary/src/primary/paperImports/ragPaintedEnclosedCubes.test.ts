import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragPaintedEnclosedCubes';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

// This solver receives only pupil-visible text. It places every small cube
// using physical coordinates and counts contact with the six painted planes.
// It does not use the generator's formulas, answer or private parameters.
function solveVisible(q: VisibleQuestion) {
  const text = (q.context ?? []).join('\n');
  const edgeMatch = /Every small cube has edge length (\d+) cm\./.exec(text);
  if (!edgeMatch) throw new Error('Missing visible cube size');
  const edge = Number(edgeMatch[1]);
  const blocks = [...text.matchAll(/Block ([A-C]) has length (\d+) cm, width (\d+) cm and height (\d+) cm\./g)]
    .map(match => ({name: match[1], dimensions: match.slice(2).map(Number)}));
  if (!blocks.length || edge <= 0) throw new Error('Missing or invalid block dimensions');
  if (!text.includes('all six outside faces, including the bottom')) throw new Error('Painted surfaces unspecified');
  if (!text.includes('After the paint dries')) throw new Error('Painting order unspecified');
  if (!text.includes('new cut faces are not painted')) throw new Error('Cut-face condition unspecified');
  const linked = q.prompt.startsWith('(a)');
  const targetMatch = /exactly (\d+) painted face/.exec(q.prompt);
  const target = q.prompt.includes('no painted faces') ? 0 : Number(targetMatch?.[1]);
  if (!Number.isInteger(target) || target < 0 || target > 3) throw new Error('Missing visible target');
  const histograms: number[][] = [];
  let total = 0;
  for (const block of blocks) {
    const [length, width, height] = block.dimensions;
    if (block.dimensions.some(d => d <= 0 || d % edge !== 0)) throw new Error('Cubes do not tile this block');
    const counts = Array<number>(7).fill(0);
    for (let x = 0; x < length; x += edge) {
      for (let y = 0; y < width; y += edge) {
        for (let z = 0; z < height; z += edge) {
          const faces = [
            x === 0, x + edge === length,
            y === 0, y + edge === width,
            z === 0, z + edge === height,
          ].filter(Boolean).length;
          counts[faces] += 1;
          total += 1;
        }
      }
    }
    histograms.push(counts);
  }
  const selected = histograms.reduce((sum, counts) => sum + counts[target], 0);
  return {numbers: linked ? [total, selected] : [selected], blocks, edge, target, linked, histograms};
}

function visible(q: Question): VisibleQuestion {
  return {context: q.context, prompt: q.prompt};
}

function fixture(prompt: string, secondBlock = false): VisibleQuestion {
  return {
    context: [
      'Block A has length 15 cm, width 21 cm and height 27 cm.',
      ...(secondBlock ? ['Block B has length 9 cm, width 9 cm and height 9 cm.'] : []),
      'Each block is painted on all six outside faces, including the bottom.',
      'After the paint dries, each block is cut into identical small cubes.',
      'Every small cube has edge length 3 cm.',
      'The cuts are parallel to the faces. No material is lost, and the new cut faces are not painted.',
    ],
    prompt,
  };
}

describe('painted and enclosed cubes', () => {
  it('anchors the independent enumeration with known rectangular solids', () => {
    const q = fixture('(a) Count all small cubes. (b) Count cubes with no painted faces.');
    const result = solveVisible(q);
    expect(result.numbers).toEqual([315, 105]);
    expect(result.histograms[0]).toEqual([105, 142, 60, 8, 0, 0, 0]);
    expect(solveVisible(fixture('How many cubes have exactly 1 painted face?')).numbers).toEqual([142]);
    expect(solveVisible(fixture('How many cubes have exactly 2 painted faces?')).numbers).toEqual([60]);
    expect(solveVisible(fixture('How many cubes have exactly 3 painted faces?')).numbers).toEqual([8]);
    expect(solveVisible(fixture('Across both blocks, how many cubes have no painted faces?', true)).numbers).toEqual([106]);
    expect(solveVisible(fixture('Across both blocks, how many cubes have exactly 2 painted faces?', true)).numbers).toEqual([72]);
  });

  it('independently solves all four variants across varied seeds and indices', () => {
    const families = new Set<string>();
    const faceTargets = new Set<number>();
    const blockCounts = new Set<number>();
    const cubeEdges = new Set<number>();
    const seeds = [-31, 0, 1, 7, 43, 101, 999, 54321, 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 36; index++) {
        const q = makeRagQuestion(seed, index);
        const result = solveVisible(visible(q));
        const expected = result.linked
          ? JSON.stringify(result.numbers.map(String))
          : String(result.numbers[0]);
        expect(q.answer).toBe(expected);
        expect(q.picture).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.explanation.length).toBeGreaterThan(30);
        expect(q.hint.length).toBeGreaterThan(15);
        cubeEdges.add(result.edge);
        blockCounts.add(result.blocks.length);
        for (const block of result.blocks) {
          for (const dimension of block.dimensions) {
            const count = dimension / result.edge;
            expect(Number.isInteger(count)).toBe(true);
            expect(count).toBeGreaterThanOrEqual(3);
            expect(count).toBeLessThanOrEqual(9);
          }
        }
        for (const n of result.numbers) {
          expect(Number.isSafeInteger(n)).toBe(true);
          expect(n).toBeGreaterThan(0);
        }
        if (result.linked) {
          families.add('linked');
          expect(result.blocks).toHaveLength(1);
          expect(q.structuredResponse?.kind).toBe('number-fields');
          expect(result.numbers[0]).toBeGreaterThan(result.numbers[1]);
          if (q.structuredResponse?.kind === 'number-fields') {
            expect(q.structuredResponse.fields).toHaveLength(2);
            expect(q.structuredResponse.fields[0].label).toContain('(a)');
            expect(q.structuredResponse.fields[1].label).toContain('(b)');
          }
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('cubes');
          if (result.blocks.length === 1) families.add('single-painted');
          else families.add(result.target === 0 ? 'multiple-enclosed' : 'multiple-painted');
        }
        if (result.target > 0) faceTargets.add(result.target);
        if (result.blocks.length > 1) {
          expect(q.context?.join(' ')).toContain('painted and cut separately');
          expect(q.prompt).toContain(`Across all ${result.blocks.length} blocks`);
        }
      }
    }
    expect([...families].sort()).toEqual(['linked', 'multiple-enclosed', 'multiple-painted', 'single-painted']);
    expect([...faceTargets].sort()).toEqual([1, 2, 3]);
    expect([...blockCounts].sort()).toEqual([1, 2, 3]);
    expect([...cubeEdges].sort()).toEqual([3, 5]);
  });

  it('retains ordered linked answers and rejects incomplete or incorrect pairs', () => {
    const q = Array.from({length: 8}, (_, i) => makeRagQuestion(47, i))
      .find(question => question.prompt.startsWith('(a)'));
    if (!q || !q.structuredResponse) throw new Error('Linked variant is missing');
    const [total, enclosed] = solveVisible(visible(q)).numbers;
    const encode = (values: number[]) => JSON.stringify(values.map(String));
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, encode([total, enclosed]))).toBe(true);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, encode([enclosed, total]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, encode([total]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, encode([total, enclosed + 1]))).toBe(false);
    expect(structuredResponseCorrect(q.structuredResponse, q.answer, encode([total + 1, enclosed]))).toBe(false);
  });

  it('reproduces questions deterministically while varying their visible dimensions', () => {
    const contexts = new Set<string>();
    const keys = new Set<string>();
    for (const seed of [-5, 0, 2026]) {
      for (let index = 0; index < 16; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        contexts.add(JSON.stringify(q.context));
        keys.add(q.key);
      }
    }
    expect(keys.size).toBe(48);
    expect(contexts.size).toBeGreaterThan(20);
  });
});
