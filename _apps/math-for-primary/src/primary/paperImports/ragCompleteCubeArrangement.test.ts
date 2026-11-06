import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Question} from '../generate';
import {P5MahaBodhiDiagram} from './P5MahaBodhiDiagram';
import {makeRagQuestion, RAG_PATTERN} from './ragCompleteCubeArrangement';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'unit'>;

function required(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error('Missing visible given: ' + pattern.source);
  return match;
}

// Read the diagram's accessible description and question text only.
// No answer, proof, explanation, worked steps or generation parameters enter this solver.
function solveVisible(q: Visible) {
  const picture = q.picture;
  if (!picture || picture.type !== 'maha-bodhi-p5' || picture.layout !== 'cube-growth') {
    throw new Error('A supported cube diagram is required');
  }
  const html = renderToStaticMarkup(createElement(P5MahaBodhiDiagram, {model: picture}));
  const description = required(html, /<desc[^>]*>([\s\S]*?)<\/desc>/)[1];
  const heights = required(description, /column heights ([0-9, ]+) unit cubes/)[1].split(',').map(Number);
  const depth = Number(required(description, /Their depths are (\d+) unit cubes/)[1]);
  const text = (q.context ?? []).join(' ');
  const edge = Number(required(text, /Each small cube has side length (\d+) cm/)[1]);
  const textDepth = Number(required(text, /The solid is (\d+) cubes? deep/)[1]);
  if (textDepth !== depth || edge !== 1) throw new Error('Inconsistent cube dimensions');
  if (!text.includes('Every row from front to back matches the front row.')) throw new Error('Missing depth rule');
  if (!text.includes('There are no gaps or hollow spaces inside the stacks.')) throw new Error('Missing support rule');
  const occupied = new Set<string>();
  for (let x = 0; x < heights.length; x++) {
    if (!Number.isInteger(heights[x]) || heights[x] <= 0) throw new Error('Invalid stack');
    for (let y = 0; y < depth; y++) {
      for (let z = 0; z < heights[x]; z++) occupied.add([x, y, z].join(','));
    }
  }
  const volume = /finished solid must have a volume of (\d+) cm³/.exec(text);
  const cube = /finished cube must have side length (\d+) cm/.exec(text);
  const box = /inside dimensions (\d+) cm from left to right, (\d+) cm from front to back and (\d+) cm high/.exec(text);
  if ([volume, cube, box].filter(Boolean).length !== 1) throw new Error('Exactly one target is needed');
  let expected = 0;
  let target = 0;
  let kind: 'volume' | 'cube' | 'cuboid';
  if (volume) {
    kind = 'volume';
    const cubicCentimetresPerCube = edge * edge * edge;
    target = Number(volume[1]) / cubicCentimetresPerCube;
    if (!Number.isInteger(target)) throw new Error('Target needs a fraction of a cube');
    expected = (Number(volume[1]) - occupied.size * cubicCentimetresPerCube) / cubicCentimetresPerCube;
  } else {
    kind = cube ? 'cube' : 'cuboid';
    const dimensions = cube ? [Number(cube[1]), Number(cube[1]), Number(cube[1])] : box!.slice(1).map(Number);
    const [length, width, height] = dimensions.map(n => n / edge);
    if (![length, width, height].every(n => Number.isInteger(n) && n > 0)) throw new Error('Invalid target dimensions');
    for (const key of occupied) {
      const [x, y, z] = key.split(',').map(Number);
      if (x >= length || y >= width || z >= height) throw new Error('Existing solid does not fit');
    }
    // Count empty positions in the requested solid instead of reusing the generator formula.
    for (let x = 0; x < length; x++) for (let y = 0; y < width; y++) for (let z = 0; z < height; z++) {
      target++;
      if (!occupied.has([x, y, z].join(','))) expected++;
    }
    if (cube && length <= Math.max(heights.length, depth, ...heights)) {
      throw new Error('This must be a specified larger cube, not the smallest enclosing cube');
    }
  }
  return {expected, target, occupied, heights, depth, kind, html};
}

function visibleOnly(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture, unit: q.unit};
}

describe('complete a cube arrangement candidate', () => {
  it('independently solves all three variants across seeds and indices', () => {
    const kinds = new Set<string>();
    const pictures = new Set<string>();
    for (let seed = 0; seed < 96; seed++) {
      const seedKinds = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(q));
        kinds.add(solved.kind);
        seedKinds.add(solved.kind);
        pictures.add(JSON.stringify(q.picture));
        expect(q.answer).toBe(String(solved.expected));
        expect(Number.isSafeInteger(solved.expected)).toBe(true);
        expect(solved.expected).toBeGreaterThan(0);
        expect(solved.target).toBeLessThanOrEqual(216);
        expect(q.unit).toBe('cubes');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(q.workedSteps!.at(-1)!.equation).toBe(`${solved.target} − ${solved.occupied.size} = ${solved.expected} cubes`);
        expect(q.hint.length).toBeGreaterThan(20);
        if (solved.kind === 'cube') {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(v => v === String(solved.expected))).toHaveLength(1);
          expect(q.choices!.every(v => Number.isInteger(Number(v)) && Number(v) >= 0)).toBe(true);
        } else {
          expect(q.choices).toBeUndefined();
        }
      }
      expect(seedKinds.size).toBe(3);
    }
    expect([...kinds].sort()).toEqual(['cube', 'cuboid', 'volume']);
    expect(pictures.size).toBeGreaterThanOrEqual(10);
  });

  it('is reproducible for unusual integer seeds and does not share mutable picture arrays', () => {
    for (const seed of [-2147483648, -1, 0, 1, 4294967295, Number.MAX_SAFE_INTEGER]) {
      for (const index of [0, 1, 2, 17]) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        expect(q.answer).toBe(String(solveVisible(visibleOnly(q)).expected));
      }
    }
    const first = makeRagQuestion(37);
    const original = makeRagQuestion(37);
    const p = first.picture;
    if (!p || p.type !== 'maha-bodhi-p5' || p.layout !== 'cube-growth') throw new Error('Missing diagram');
    p.heights[0] = 99;
    expect(makeRagQuestion(37)).toEqual(original);
  });

  it('renders each depicted cube once and keeps the drawings within the existing viewBox', () => {
    for (let seed = 0; seed < 24; seed++) {
      const solved = solveVisible(visibleOnly(makeRagQuestion(seed, seed % 3)));
      const drawn = [...solved.html.matchAll(/data-unit-cube="([0-9,]+)"/g)].map(match => match[1]);
      expect(drawn.length).toBe(solved.occupied.size);
      expect(new Set(drawn)).toEqual(solved.occupied);
      expect(solved.html.match(/Solid 1/g)).toHaveLength(1);
      expect(solved.html).not.toContain('Solid 2');
      const [vx, vy, vw, vh] = required(solved.html, /viewBox="([0-9. ]+)"/)[1].split(' ').map(Number);
      const [, tx, ty] = required(solved.html, /transform="translate\(([0-9.]+) ([0-9.]+)\)"/).map(Number);
      for (const match of solved.html.matchAll(/<polygon points="([^"]+)"/g)) {
        for (const point of match[1].split(' ')) {
          const [x, y] = point.split(',').map(Number);
          expect(x + tx).toBeGreaterThanOrEqual(vx);
          expect(x + tx).toBeLessThanOrEqual(vx + vw);
          expect(y + ty).toBeGreaterThanOrEqual(vy);
          expect(y + ty).toBeLessThanOrEqual(vy + vh);
        }
      }
    }
  });

  it('declares only the intended Primary 5 skills and family', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('complete-or-reduce-cube-arrangement');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.VOL.01', 'P5.S.VOL.03']);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
});
