import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragMixedCircularCompositeArea';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'picture' | 'unit'>;
type Point = [number, number];

function visibleMeasures(question: VisibleQuestion) {
  const text = (question.context ?? []).join(' ');
  const diameterMatch = /AB = AC = (\d+) cm/.exec(text);
  const piMatch = /Use π = (\d+\.\d+)/.exec(text);
  if (!diameterMatch || !piMatch) throw new Error('Missing visible length or pi instruction');
  return {diameter: Number(diameterMatch[1]), pi: Number(piMatch[1])};
}

// Independent boundary integration of the actual shaded SVG paths.
// No stored answer, worked solution, seed or generator parameters are read.
// All arcs in this construction are circular quadrants. Integrating x dy - y dx
// gives each region's area, with the pupil's stated value of pi used for sectors.
function shadedPathArea(d: string, pi: number): number {
  const tokens = d.match(/[MAZ]|-?\d+(?:\.\d+)?/g) ?? [];
  if (tokens.join(' ') !== d.trim().split(/\s+/).join(' ')) {
    throw new Error('Unsupported path syntax');
  }
  let position = 0;
  let start: Point | undefined;
  let current: Point | undefined;
  let integral = 0;
  const read = (): number => {
    const value = Number(tokens[position++]);
    if (!Number.isFinite(value)) throw new Error('Invalid path coordinate');
    return value;
  };
  while (position < tokens.length) {
    const command = tokens[position++];
    if (command === 'M') {
      if (start) throw new Error('Unexpected second subpath');
      start = [read(), read()];
      current = start;
    } else if (command === 'A') {
      if (!current) throw new Error('Arc without a starting point');
      const radius = read();
      const ry = read();
      const rotation = read();
      const large = read();
      const sweep = read();
      const next: Point = [read(), read()];
      if (radius <= 0 || ry !== radius || rotation !== 0 || large !== 0 || ![0, 1].includes(sweep)) {
        throw new Error('Expected a small circular arc');
      }
      const dx = next[0] - current[0];
      const dy = next[1] - current[1];
      if (Math.abs(dx * dx + dy * dy - 2 * radius * radius) > 1e-7) {
        throw new Error('Arc endpoints do not form a quadrant');
      }
      const direction = sweep === 1 ? 1 : -1;
      const cx = (current[0] + next[0]) / 2 - direction * dy / 2;
      const cy = (current[1] + next[1]) / 2 + direction * dx / 2;
      integral += cx * dy - cy * dx + radius * radius * direction * pi / 2;
      current = next;
    } else if (command === 'Z') {
      if (!start || !current) throw new Error('Empty closed path');
      integral += current[0] * start[1] - current[1] * start[0];
      current = start;
    } else {
      throw new Error(`Unexpected path command: ${command}`);
    }
  }
  if (tokens.at(-1) !== 'Z') throw new Error('Shaded region is not closed');
  return Math.abs(integral) / 2;
}

function solveVisible(question: VisibleQuestion): {area: number; diameter: number; regions: number[]} {
  const {diameter, pi} = visibleMeasures(question);
  const picture = question.picture;
  if (!picture || picture.type !== 'batch11-upper') throw new Error('Missing supported diagram');
  const diameterLines = picture.marks.flatMap(mark => mark.kind === 'line'
    ? [Math.hypot(mark.x2 - mark.x1, mark.y2 - mark.y1)] : []);
  if (diameterLines.length !== 2 || diameterLines[0] !== diameterLines[1]) {
    throw new Error('Expected two equal visible diameters');
  }
  const scale = diameter / diameterLines[0];
  const regions = picture.marks.flatMap(mark => mark.kind === 'path' && mark.fill && mark.fill !== 'none'
    ? [shadedPathArea(mark.d, pi) * scale * scale] : []);
  if (regions.length !== 3) throw new Error('Expected three shaded regions');
  return {area: regions.reduce((sum, area) => sum + area, 0), diameter, regions};
}

describe('mixed circular composite area candidate', () => {
  it('independently solves the visible geometry across varied seeds and indices', () => {
    const dimensions = new Set<number>();
    for (const seed of [-23, ...Array.from({length: 48}, (_, i) => i), 1009]) {
      for (let index = 0; index < 4; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(question);
        dimensions.add(solved.diameter);
        expect(Number(question.answer)).toBeCloseTo(solved.area, 6);
        expect(question.unit).toBe('cm²');
        expect(question.answerFormat).toBeUndefined();
        expect(question.structuredResponse).toBeUndefined();
        expect(solved.diameter).toBeGreaterThanOrEqual(16);
        expect(solved.diameter).toBeLessThanOrEqual(64);
        expect(solved.diameter % 8).toBe(0);
        expect(solved.diameter).not.toBe(32);
        expect(solved.regions.every(area => area > 0)).toBe(true);
        expect(solved.regions[1]).toBeCloseTo(solved.regions[2], 7);
        expect(solved.area).toBeLessThan(solved.diameter ** 2 / 2);
        expect(question.workedSteps?.length).toBeGreaterThanOrEqual(5);
      }
    }
    expect(dimensions.size).toBeGreaterThanOrEqual(4);
  });

  it('has an independently checked concrete result from its visible dimensions', () => {
    let example: Question | undefined;
    for (let seed = 0; seed < 256 && !example; seed++) {
      const question = makeRagQuestion(seed);
      if (visibleMeasures(question).diameter === 24) example = question;
    }
    if (!example) throw new Error('No 24 cm example found');
    // For the visible 24 cm construction, the overlap is 82.08 cm²
    // and each of the two equal side regions is 41.04 cm².
    const solved = solveVisible(example);
    expect(solved.regions[0]).toBeCloseTo(82.08, 7);
    expect(solved.regions[1]).toBeCloseTo(41.04, 7);
    expect(solved.regions[2]).toBeCloseTo(41.04, 7);
    expect(Number(example.answer)).toBeCloseTo(164.16, 7);
  });

  it('is deterministic and exposes the required family metadata', () => {
    expect(makeRagQuestion(711, 3)).toEqual(makeRagQuestion(711, 3));
    expect(makeRagQuestion(711, 3).key).not.toBe(makeRagQuestion(711, 4).key);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-mixed-circular-composite-area');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.CIRCLE.02', 'P6.S.CIRCLE.03']);
  });
});
