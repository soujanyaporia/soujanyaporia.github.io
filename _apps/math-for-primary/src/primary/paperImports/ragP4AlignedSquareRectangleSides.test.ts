import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4AlignedSquareRectangleSides';

function readProblem(q: Question) {
  const text = q.context?.join(' ') ?? '';
  const givens = new Map(Array.from(text.matchAll(/\b([A-Z]{2}) = (\d+) cm\b/g), m => [m[1], Number(m[2])] as const));
  const get = (name: string) => {
    const n = givens.get(name);
    if (n === undefined) throw Error(`Missing length ${name}`);
    return n;
  };
  const target = /^How long is ([A-Z]{2}) in centimetres\?$/.exec(q.prompt)?.[1];
  let expected: number;
  switch (target) {
    case 'AG': expected = get('CD') + get('BC'); break;
    case 'AB': expected = get('GE') - (get('AG') - get('BC')); break;
    case 'DE': expected = get('GE') - get('AB'); break;
    case 'UW': {
      expect(text).toContain('PQTS and QRUT are identical squares');
      const factor = /is (\d+) times as long as its short side/.exec(text);
      if (!factor) throw Error('Missing comparison between the rectangle sides');
      expected = get('PQ') * Number(factor[1]);
      break;
    }
    default: throw Error('Missing or unrecognised target edge');
  }
  return { givens, target, expected };
}

it('has exactly one choice justified by the stated side lengths', () => {
  const examples = new Map<string, Set<string>>();
  for (let seed = -12; seed <= 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { target, expected } = readProblem(q);
      expect(expected).toBeGreaterThan(0);
      expect(Number.isInteger(expected)).toBe(true);
      expect(q.unit).toBe('cm');
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices?.filter(v => Number(v) === expected)).toEqual([String(expected)]);
      expect(q.answer).toBe(String(expected));
      if (!examples.has(target)) examples.set(target, new Set());
      examples.get(target)!.add(JSON.stringify(q.context));
    }
  }
  expect([...examples.keys()].sort()).toEqual(['AB', 'AG', 'DE', 'UW']);
  for (const values of examples.values()) expect(values.size).toBeGreaterThan(5);
});

it('draws the shared edges and places each letter at the correct end of its segment', () => {
  for (let seed = 0; seed < 80; seed++) {
    const q = makeRagQuestion(seed, 2);
    const { givens, target, expected } = readProblem(q);
    const pic = q.picture;
    if (pic?.type !== 'batch11-upper') throw Error('Missing labelled figure');
    const lines = pic.marks.flatMap(m => m.kind === 'line' ? [m] : []);
    const ends = lines.flatMap(l => [[l.x1, l.y1], [l.x2, l.y2]]);
    const corners = new Map<string, number[]>();
    for (const mark of pic.marks) {
      if (mark.kind !== 'text') continue;
      const distance = ([x, y]: number[]) => Math.hypot(x - mark.x, y - mark.y);
      corners.set(mark.text, ends.reduce((a, b) => distance(a) <= distance(b) ? a : b));
    }
    const name = (x: number, y: number) => {
      for (const [letter, [px, py]] of corners) if (px === x && py === y) return letter;
      throw Error('Unlabelled endpoint');
    };
    const edges = lines.map(l => [name(l.x1, l.y1), name(l.x2, l.y2)].sort().join('')).sort();
    expect(edges).toEqual(target === 'UW'
      ? ['PQ', 'PS', 'QR', 'QT', 'RU', 'ST', 'TU', 'TV', 'UW', 'VW']
      : ['AB', 'AG', 'BC', 'CD', 'CF', 'DE', 'EF', 'FG']);
    const drawnLength = (edge: string) => {
      const [x, y] = corners.get(edge[0])!;
      const [u, v] = corners.get(edge[1])!;
      return Math.hypot(x - u, y - v);
    };
    const [first, cm] = [...givens][0];
    const pixelsPerCm = drawnLength(first) / cm;
    for (const [edge, value] of givens) expect(drawnLength(edge) / pixelsPerCm).toBeCloseTo(value);
    expect(drawnLength(target) / pixelsPerCm).toBeCloseTo(expected);
  }
});

it('repeats a seed and index and varies visible problems across indices', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const q = makeRagQuestion(317, index);
    expect(makeRagQuestion(317, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
  }
  expect(contexts.size).toBeGreaterThan(5);
});
