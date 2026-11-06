import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Picture} from '../Picture';
import {correctAnswer, type Question} from '../generate';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {makeRagQuestion, RAG_PATTERN} from './ragCountUnitCubesVolume';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;

// Only rendered givens enter this solver. It counts horizontal levels instead
// of using the generator's front-column sum, and never reads the answer.
function solveVisible(q: Visible) {
  const text = (q.context ?? []).join(' ');
  let cubes = 0;
  if (q.picture) {
    const m = q.picture;
    if (m.type !== 'maha-bodhi-p5' || m.layout !== 'cube-growth') {
      throw new Error('Unsupported visible diagram');
    }
    if (m.depths.length !== 1) throw new Error('Expected one solid');
    for (let level = 1; level <= Math.max(...m.heights); level++) {
      for (let row = 0; row < m.depths[0]; row++) {
        for (const height of m.heights) if (height >= level) cubes++;
      }
    }
  } else {
    const match = /A model uses (\d+) identical small cubes\./.exec(text);
    if (!match) throw new Error('Missing visible cube count');
    cubes = Number(match[1]);
  }
  if (q.prompt.startsWith('Count all')) {
    return {cubes, edge: 1, value: cubes, mode: 'count', unit: 'unit cubes'};
  }
  const match = /Each small cube has an edge length of (\d+) cm\./.exec(text);
  if (!match) throw new Error('Missing visible edge length');
  const edge = Number(match[1]);
  // Count the 1 cm³ cubes that fit inside one small cube.
  let oneCube = 0;
  for (let x = 0; x < edge; x++) {
    for (let y = 0; y < edge; y++) {
      for (let z = 0; z < edge; z++) oneCube++;
    }
  }
  let value = 0;
  for (let cube = 0; cube < cubes; cube++) value += oneCube;
  return {
    cubes, edge, value, unit: 'cm³',
    mode: !q.picture ? 'given-count-edge' : edge === 1 ? 'pictured-unit' : 'pictured-edge',
  };
}

describe('count unit cubes and find volume candidate', () => {
  it('checks the independent solver against hand-calculated examples', () => {
    const picture: Question['picture'] = {
      type: 'maha-bodhi-p5', layout: 'cube-growth',
      heights: [4, 2, 1], depths: [3],
    };
    expect(solveVisible({prompt: 'Count all the cubes.', picture}).value).toBe(21);
    expect(solveVisible({
      prompt: 'Find the volume.', picture,
      context: ['Each small cube has an edge length of 3 cm.'],
    }).value).toBe(567);
    expect(solveVisible({
      prompt: 'Find the total volume.',
      context: ['A model uses 13 identical small cubes.', 'Each small cube has an edge length of 4 cm.'],
    }).value).toBe(832);
    expect(() => solveVisible({prompt: 'Find the volume.', picture})).toThrow('Missing visible edge');
  });

  it('independently solves varied seeds and indices, including hidden cubes', () => {
    const modes = new Set<string>();
    const answersByMode = new Map<string, Set<number>>();
    for (let seed = -16; seed < 112; seed++) for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const visible: Visible = {prompt: q.prompt, context: q.context, picture: q.picture};
      const result = solveVisible(visible);
      modes.add(result.mode);
      if (!answersByMode.has(result.mode)) answersByMode.set(result.mode, new Set());
      answersByMode.get(result.mode)!.add(result.value);
      expect(q.answer).toBe(String(result.value));
      expect(q.unit).toBe(result.unit);
      expect(correctAnswer(q, String(result.value))).toBe(true);
      expect(correctAnswer(q, String(result.value + 1))).toBe(false);
      expect(Number.isSafeInteger(result.value)).toBe(true);
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThanOrEqual(6000);
      expect(q.hint.length).toBeGreaterThan(15);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
      expect(q.explanation).toBe(q.workedSteps!
        .map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '));
      for (const step of q.workedSteps!) {
        const parts = /^(.+) = (\d+) (?:cubes|cm³)$/.exec(step.equation ?? '');
        expect(parts).not.toBeNull();
        const calculated = parts![1].split(' + ').reduce((sum, term) =>
          sum + term.split(' × ').reduce((product, factor) => product * Number(factor), 1), 0);
        expect(calculated).toBe(Number(parts![2]));
      }
      if (result.mode === 'pictured-unit') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices!.filter(choice => choice === String(result.value))).toHaveLength(1);
        expect(q.choices!.every(choice => /^[1-9]\d*$/.test(choice))).toBe(true);
      } else {
        expect(q.choices).toBeUndefined();
      }
      if (q.picture?.type === 'maha-bodhi-p5' && q.picture.layout === 'cube-growth') {
        const m = q.picture;
        expect(m.depths).toHaveLength(1);
        expect(m.depths[0]).toBeGreaterThanOrEqual(2);
        expect(m.depths[0]).toBeLessThanOrEqual(3);
        expect(m.heights.length).toBeGreaterThanOrEqual(2);
        expect(m.heights.length).toBeLessThanOrEqual(4);
        expect(m.heights.every(h => Number.isInteger(h) && h >= 1 && h <= 4)).toBe(true);
        // At least one rear cube is occluded by another cube in its column.
        expect(m.heights.some(h => h >= 2)).toBe(true);
        expect(q.context!.join(' ')).toContain('There are no gaps inside the solid.');
        if (result.mode === 'pictured-edge') expect(new Set(m.heights).size).toBe(1);
        else expect(new Set(m.heights).size).toBeGreaterThan(1);
      }
    }
    expect([...modes].sort()).toEqual(['count', 'given-count-edge', 'pictured-edge', 'pictured-unit']);
    for (const answers of answersByMode.values()) expect(answers.size).toBeGreaterThanOrEqual(6);
  });

  it('renders one solid through the supported app picture component without clipping cubes', () => {
    for (let seed = 0; seed < 16; seed++) for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (!q.picture) continue;
      const html = renderToStaticMarkup(createElement(Picture, {model: q.picture}));
      const cubes = solveVisible({prompt: q.prompt, context: q.context, picture: q.picture}).cubes;
      const cells = [...html.matchAll(/data-unit-cube="([^"]+)"/g)].map(m => m[1]);
      expect(cells).toHaveLength(cubes);
      expect(new Set(cells).size).toBe(cubes);
      expect(html).toContain('role="img"');
      expect(html).toContain('Solid 1');
      expect(html).not.toContain('Solid 2');
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
      const view = /viewBox="([^"]+)"/.exec(html)![1].split(' ').map(Number);
      const origin = /transform="translate\(([-\d.]+) ([-\d.]+)\)"/.exec(html);
      expect(origin).not.toBeNull();
      const [dx, dy] = origin!.slice(1).map(Number);
      const polygons = [...html.matchAll(/points="([^"]+)"/g)];
      expect(polygons).toHaveLength(3 * cubes);
      for (const polygon of polygons) for (const point of polygon[1].split(' ')) {
        const [x, y] = point.split(',').map(Number);
        expect(x + dx).toBeGreaterThanOrEqual(view[0]);
        expect(x + dx).toBeLessThanOrEqual(view[0] + view[2]);
        expect(y + dy).toBeGreaterThanOrEqual(view[1]);
        expect(y + dy).toBeLessThanOrEqual(view[1] + view[3]);
      }
    }
  });

  it('is reproducible and uses existing P5 skills', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('count-unit-cubes-and-find-volume');
    for (const id of RAG_PATTERN.skillIds) {
      expect(CURRICULUM_SKILLS.some(skill => skill.id === id && skill.level === 5)).toBe(true);
    }
    for (const seed of [-31, 0, 29, 2147483647]) {
      for (let index = -4; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      expect(new Set(Array.from({length: 4}, (_, index) => makeRagQuestion(seed, index).key)).size).toBe(4);
    }
  });
});
