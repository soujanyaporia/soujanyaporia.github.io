import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragForwardReverseRotations';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture' | 'choices'>;
type Vector = {x: number; y: number};
type Direction = 'clockwise' | 'anti-clockwise';
type Mode = 'forward' | 'reverse' | 'alternative';

function visible(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, picture: q.picture, choices: q.choices};
}

// Read rendered label positions and ray endpoints, without generator parameters,
// answers, hints, explanations, or worked steps.
function readDirections(q: Visible): Map<string, Vector> {
  const p = q.picture;
  if (!p || p.type !== 'batch11-upper') throw new Error('Missing direction diagram');
  const rays = p.marks.flatMap(mark => mark.kind === 'line' ? [mark] : []);
  const labels = p.marks.flatMap(mark => mark.kind === 'text' && mark.text !== 'O' ? [mark] : []);
  if (rays.length !== 8 || labels.length !== 8) throw new Error('Expected eight labelled rays');
  const cx = rays[0].x1;
  const cy = rays[0].y1;
  if (rays.some(ray => ray.x1 !== cx || ray.y1 !== cy)) throw new Error('Rays do not share a centre');
  const result = new Map<string, Vector>();
  const occupied = new Set<number>();
  for (const label of labels) {
    const distances = rays.map(ray => (label.x - ray.x2) ** 2 + (label.y - ray.y2) ** 2);
    const nearest = distances.indexOf(Math.min(...distances));
    if (occupied.has(nearest) || result.has(label.text)) throw new Error('Ambiguous label placement');
    occupied.add(nearest);
    const ray = rays[nearest];
    const length = Math.hypot(ray.x2 - cx, ray.y2 - cy);
    if (length === 0) throw new Error('Empty ray');
    result.set(label.text, {x: (ray.x2 - cx) / length, y: (ray.y2 - cy) / length});
  }
  return result;
}

function solveVisible(q: Visible): {answer: string; mode: Mode; angles: number[]; directions: Direction[]} {
  const positions = readDirections(q);
  const text = (q.context || []).join('\n');
  if (!text.includes('eight lines') || !text.includes('equally spaced')) throw new Error('Missing spacing given');

  // Rotate actual diagram vectors. Screen y increases downwards, so a positive
  // rotation matrix represents a clockwise turn. This does not use index arithmetic.
  const turn = (name: string, degrees: number, dir: Direction): string => {
    const from = positions.get(name);
    if (!from) throw new Error(`Unknown visible place: ${name}`);
    const radians = degrees * Math.PI / 180 * (dir === 'clockwise' ? 1 : -1);
    const target = {
      x: Math.cos(radians) * from.x - Math.sin(radians) * from.y,
      y: Math.sin(radians) * from.x + Math.cos(radians) * from.y,
    };
    const matches = [...positions].filter(([, vector]) => Math.hypot(vector.x - target.x, vector.y - target.y) < 1e-8);
    if (matches.length !== 1) throw new Error('Turn does not reach exactly one labelled ray');
    return matches[0][0];
  };
  const recoverStart = (end: string, degrees: number, dir: Direction): string => {
    const starts = [...positions.keys()].filter(name => turn(name, degrees, dir) === end);
    if (starts.length !== 1) throw new Error('Starting facing is not unique');
    return starts[0];
  };

  const forward = /^Noor starts by facing the (.+)\. She turns (\d+)° (clockwise|anti-clockwise)\.$/m.exec(text);
  if (forward) {
    const degrees = Number(forward[2]);
    const dir = forward[3] as Direction;
    return {answer: turn(forward[1], degrees, dir), mode: 'forward', angles: [degrees], directions: [dir]};
  }
  const reverse = /^Noor turns (\d+)° (clockwise|anti-clockwise) and finishes facing the (.+)\.$/m.exec(text);
  if (reverse) {
    const degrees = Number(reverse[1]);
    const dir = reverse[2] as Direction;
    return {answer: recoverStart(reverse[3], degrees, dir), mode: 'reverse', angles: [degrees], directions: [dir]};
  }
  const first = /^Starting from her original direction, a (\d+)° (clockwise|anti-clockwise) turn would leave Noor facing the (.+)\.$/m.exec(text);
  const alternative = /^Instead, she makes a (\d+)° (clockwise|anti-clockwise) turn from that same original direction\.$/m.exec(text);
  if (!first || !alternative) throw new Error('Unrecognised visible givens');
  const degrees = Number(first[1]);
  const dir = first[2] as Direction;
  const otherDegrees = Number(alternative[1]);
  const otherDir = alternative[2] as Direction;
  const start = recoverStart(first[3], degrees, dir);
  return {
    answer: turn(start, otherDegrees, otherDir),
    mode: 'alternative',
    angles: [degrees, otherDegrees],
    directions: [dir, otherDir],
  };
}

const seeds = [-19, 0, 1, 2147483647, ...Array.from({length: 64}, (_, i) => 31 + i * 97)];
const cases = seeds.flatMap(seed => Array.from({length: 6}, (_, index) => ({seed, index, q: makeRagQuestion(seed, index)})));

describe('forward and reverse rotations candidate', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const modes = new Set<Mode>();
    const directions = new Set<Direction>();
    const angles = new Set<number>();
    for (const {q} of cases) {
      const solution = solveVisible(visible(q));
      expect(q.answer).toBe(solution.answer);
      modes.add(solution.mode);
      solution.directions.forEach(dir => directions.add(dir));
      for (const angle of solution.angles) {
        expect(angle).toBeGreaterThan(0);
        expect(angle).toBeLessThan(360);
        expect(angle % 45).toBe(0);
        expect(angle).not.toBe(225);
        angles.add(angle);
      }
    }
    expect([...modes].sort()).toEqual(['alternative', 'forward', 'reverse']);
    expect([...directions].sort()).toEqual(['anti-clockwise', 'clockwise']);
    expect(angles.has(135)).toBe(true);
    expect(angles.has(270)).toBe(true);
    expect(angles.has(315)).toBe(true);
  });

  it('draws eight distinct, equally spaced directions with readable label locations', () => {
    for (const {q} of cases) {
      const positions = readDirections(visible(q));
      const headings = [...positions.values()].map(v => (Math.atan2(v.y, v.x) * 180 / Math.PI + 360) % 360).sort((a, b) => a - b);
      for (let i = 0; i < headings.length; i++) {
        const gap = (headings[(i + 1) % headings.length] - headings[i] + 360) % 360;
        expect(gap).toBeCloseTo(45, 8);
      }
      const p = q.picture;
      if (!p || p.type !== 'batch11-upper') throw new Error('Missing diagram');
      for (const mark of p.marks) {
        if (mark.kind === 'text') {
          expect(mark.x).toBeGreaterThanOrEqual(0);
          expect(mark.x + mark.text.length * 7).toBeLessThan(320);
          expect(mark.y).toBeGreaterThanOrEqual(12);
          expect(mark.y).toBeLessThanOrEqual(195);
        }
      }
    }
  });

  it('preserves named free responses and four-choice responses without angle units', () => {
    for (const {q} of cases) {
      const solution = solveVisible(visible(q));
      expect(q.unit).toBeUndefined();
      expect(q.hint.length).toBeGreaterThan(20);
      expect(q.workedSteps && q.workedSteps.length).toBeGreaterThanOrEqual(4);
      expect(q.workedSteps?.[0].equation).toBe('360° ÷ 8 = 45°');
      expect(q.workedSteps?.[q.workedSteps.length - 1].text).toContain(solution.answer);
      if (solution.mode === 'reverse') {
        expect(q.choices).toBeUndefined();
      } else {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(choice => choice === solution.answer)).toHaveLength(1);
        const labels = readDirections(visible(q));
        expect(q.choices?.every(choice => labels.has(choice))).toBe(true);
      }
    }
  });

  it('derives answers from the diagram even when answer-place labels are exchanged', () => {
    for (const {q} of cases.slice(0, 36)) {
      const original = visible(q);
      const oldAnswer = solveVisible(original).answer;
      const names = [...readDirections(original).keys()];
      const givens = (original.context || []).join(' ');
      const other = names.find(name => name !== oldAnswer && !givens.includes(name));
      if (!other || givens.includes(oldAnswer)) throw new Error('Expected an unmentioned target and spare label');
      const p = original.picture;
      if (!p || p.type !== 'batch11-upper') throw new Error('Missing diagram');
      const swap = (value: string) => value.split(oldAnswer).join('#').split(other).join(oldAnswer).split('#').join(other);
      const changed: Visible = {
        ...original,
        choices: original.choices?.map(swap),
        picture: {
          ...p,
          label: swap(p.label),
          marks: p.marks.map(mark => mark.kind === 'text' ? {...mark, text: swap(mark.text)} : {...mark}),
        },
      };
      expect(solveVisible(changed).answer).toBe(other);
      expect(solveVisible(original).answer).toBe(oldAnswer);
    }
  });

  it('is deterministic and produces varied visible questions', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('forward-and-reverse-rotations');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.ANGLE.02', 'P5.S.ANGLE.04']);
    for (const {seed, index, q} of cases.slice(0, 48)) {
      expect(makeRagQuestion(seed, index)).toEqual(q);
    }
    expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
    const fingerprints = new Set(cases.map(({q}) => JSON.stringify(visible(q))));
    expect(fingerprints.size).toBeGreaterThan(100);
  });
});
