import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragCubeEdgeAndVolume';

// Accept only visible text, never the answer, worked solution or generator state.
function solveVisible(visible: Pick<Question, 'context' | 'prompt'>) {
  const text = [...(visible.context ?? []), visible.prompt].join(' ');
  if (!/\bcube\b/i.test(text)) throw new Error('The solid must visibly be a cube.');
  const matches = [...text.matchAll(/volume is (\d+) cm³/g)];
  if (matches.length !== 1) throw new Error('Expected exactly one visible volume.');
  const volume = Number(matches[0]![1]);
  if (!Number.isSafeInteger(volume) || volume <= 0) throw new Error('Invalid volume.');

  // Recover the edge by searching possible lengths, independently of generation.
  let edge = 1;
  while (edge * edge * edge < volume) edge += 1;
  if (edge * edge * edge !== volume) throw new Error('Volume is not a perfect cube.');

  if (/area of one square face/i.test(visible.prompt)) {
    return {volume, edge, variant: 'face', answer: edge * edge, unit: 'cm²'};
  }
  if (/How long is each edge/i.test(visible.prompt)) {
    return {volume, edge, variant: 'edge', answer: edge, unit: 'cm'};
  }
  throw new Error('Unrecognised requested quantity.');
}

const seeds = [-2147483648, -37, -1, ...Array.from({length: 96}, (_,i) => i), 65537, Number.MAX_SAFE_INTEGER];

describe('cube edge and volume candidate', () => {
  test('the visible solver distinguishes edge length from face area', () => {
    const context = ['A block is a cube. Its volume is 216 cm³.'];
    expect(solveVisible({context, prompt: 'How long is each edge of the block?'}))
      .toMatchObject({answer: 6, unit: 'cm'});
    expect(solveVisible({context, prompt: 'What is the area of one square face of the block?'}))
      .toMatchObject({answer: 36, unit: 'cm²'});
    expect(() => solveVisible({
      context: ['A block is a cube. Its volume is 30 cm³.'],
      prompt: 'How long is each edge of the block?',
    })).toThrow('Volume is not a perfect cube.');
  });

  test('independently solves visible givens across varied seeds and indices', () => {
    const variants = new Set<string>();
    const volumes = new Map<string, Set<number>>();
    for (const seed of seeds) {
      for (let index = 0; index < 12; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({context: question.context, prompt: question.prompt});
        expect(question.answer).toBe(String(solved.answer));
        expect(question.unit).toBe(solved.unit);
        expect(solved.edge).toBeGreaterThanOrEqual(2);
        expect(solved.edge).toBeLessThanOrEqual(12);
        expect([125, 1000]).not.toContain(solved.volume);
        expect(question.picture).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(question.hint.trim().length).toBeGreaterThan(0);
        expect(question.explanation.trim().length).toBeGreaterThan(0);
        expect(question.workedSteps).toHaveLength(solved.variant === 'face' ? 3 : 2);
        const equations = question.workedSteps!.map(step => step.equation);
        expect(equations).toContain(`${solved.edge} × ${solved.edge} × ${solved.edge} = ${solved.volume} cm³`);
        expect(equations).toContain(`Edge length = ${solved.edge} cm`);
        if (solved.variant === 'face') {
          expect(equations).toContain(`${solved.edge} × ${solved.edge} = ${solved.answer} cm²`);
        }
        variants.add(solved.variant);
        if (!volumes.has(solved.variant)) volumes.set(solved.variant, new Set());
        volumes.get(solved.variant)!.add(solved.volume);
      }
    }
    expect([...variants].sort()).toEqual(['edge', 'face']);
    for (const values of volumes.values()) expect(values.size).toBeGreaterThanOrEqual(8);
  });

  test('repeats deterministically and uses the required family metadata', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-cube-edge-and-volume');
    const allowedSkills = new Set(['P6.S.VOL.01', 'P6.S.VOL.03', 'P5.S.VOL.03']);
    expect(RAG_PATTERN.skillIds.every(id => allowedSkills.has(id))).toBe(true);
    for (const seed of seeds) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 7)).toEqual(makeRagQuestion(seed, 7));
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
  });
});
