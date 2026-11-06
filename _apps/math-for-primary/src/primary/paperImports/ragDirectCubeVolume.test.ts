import {expect, test} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragDirectCubeVolume';

// This oracle receives only pupil-visible text. It counts unit squares and
// unit cubes without using the answer, proof, worked solution or RNG state.
function solveVisible(prompt: string, context: readonly string[], display = '') {
  const visible = [...context, prompt, display].join(' ');
  if (!/\bcube\b/i.test(visible)) throw new Error('The solid must be identified as a cube.');
  const matches = [...visible.matchAll(/Each edge is (\d+) cm long\./g)];
  if (matches.length !== 1) throw new Error('Expected one visible edge length in centimetres.');
  const edge = Number(matches[0][1]);
  if (!Number.isInteger(edge) || edge < 2 || edge > 16) {
    throw new Error('Edge is outside the intended whole-number bounds.');
  }
  let baseSquares = 0;
  let unitCubes = 0;
  for (let row = 0; row < edge; row += 1) {
    for (let column = 0; column < edge; column += 1) {
      baseSquares += 1;
      for (let layer = 0; layer < edge; layer += 1) {
        unitCubes += 1;
      }
    }
  }
  return {edge, baseSquares, unitCubes};
}

test('answers agree with unit-cube counting from visible givens across varied seeds and indices', () => {
  const seenEdges = new Set<number>();
  for (let seed = -32; seed < 96; seed += 1) {
    for (let index = 0; index < 5; index += 1) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible(q.prompt, q.context ?? [], q.display);
      seenEdges.add(solved.edge);
      expect([8, 9, 15]).not.toContain(solved.edge);
      expect(q.answer).toMatch(/^\d+$/);
      expect(Number(q.answer)).toBe(solved.unitCubes);
      expect(solved.unitCubes).toBeLessThanOrEqual(4096);
      expect(q.unit).toBe('cm³');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.picture).toBeUndefined();
    }
  }
  expect(seenEdges.size).toBeGreaterThanOrEqual(8);
});

test('worked steps explain equal dimensions and give correct area and volume with units', () => {
  for (const seed of [-2147483648, -1, 0, 17, 42, 314159, 2147483647]) {
    const q = makeRagQuestion(seed, 3);
    const {edge, baseSquares, unitCubes} = solveVisible(q.prompt, q.context ?? [], q.display);
    expect(q.workedSteps).toHaveLength(3);
    expect(q.workedSteps?.[0].equation).toBe(`Length = width = height = ${edge} cm`);
    expect(q.workedSteps?.[1].equation).toBe(`${edge} × ${edge} = ${baseSquares} cm²`);
    expect(q.workedSteps?.[2].equation).toBe(`${baseSquares} × ${edge} = ${unitCubes} cm³`);
    expect(q.hint.length).toBeGreaterThan(0);
    expect(q.explanation).toContain(`${unitCubes} cm³`);
  }
});

test('generation is deterministic and metadata identifies the single P5 family', () => {
  expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  expect(RAG_PATTERN.level).toBe(5);
  expect(RAG_PATTERN.canonicalPatternId).toBe('p5-direct-cube-and-cuboid-volume');
  expect(RAG_PATTERN.skillIds).toEqual(['P5.S.VOL.03']);
  for (const seed of [-99, 0, 1, 2026]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    const keys = new Set<string>();
    for (let index = 0; index < 12; index += 1) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      keys.add(q.key);
    }
    expect(keys.size).toBe(12);
  }
});
