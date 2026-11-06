import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch9EarlyPicture } from './batch9EarlyPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragPicturedFraction';

type Piece = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>['pieces'][number];
type Givens = Pick<Question, 'prompt' | 'picture'>;

function twiceArea(p: Piece): number {
  const sum = p.points.reduce((acc, [x, y], i) => {
    const [nextX, nextY] = p.points[(i + 1) % p.points.length];
    return acc + x * nextY - y * nextX;
  }, 0);
  return Math.abs(sum);
}

// Join touching polygons. Read the separate figures in ordinary reading order.
function figures(pieces: Piece[]): Piece[][] {
  const pending = new Set(pieces);
  const groups: Piece[][] = [];
  for (const first of pieces) {
    if (!pending.delete(first)) continue;
    const group = [first];
    for (const current of group) {
      for (const next of pending) {
        if (!current.points.some(([x, y]) => next.points.some(([u, v]) => x === u && y === v))) continue;
        pending.delete(next);
        group.push(next);
      }
    }
    groups.push(group);
  }
  const start = (group: Piece[], axis: 0 | 1) => Math.min(...group.flatMap(p => p.points.map(vertex => vertex[axis])));
  return groups.sort((a, b) => start(a, 1) - start(b, 1) || start(a, 0) - start(b, 0));
}

function solve({ prompt, picture }: Givens) {
  if (picture?.type === 'fraction') {
    expect(picture.parts).toBeLessThanOrEqual(12);
    expect(picture.filled).toBeGreaterThan(0);
    expect(picture.filled).toBeLessThan(picture.parts);
    const white = prompt.includes('unshaded');
    const count = white ? picture.parts - picture.filled : picture.filled;
    return { kind: white ? 'read white' : 'read blue', fraction: `${count}/${picture.parts}` };
  }
  if (picture?.type !== 'batch9-early' || picture.layout !== 'area-fraction') throw Error('Missing partition diagram');
  const groups = figures(picture.pieces);
  if (prompt.includes('piece on the right')) {
    expect(groups).toHaveLength(2);
    const [whole, piece] = groups;
    expect(whole.every(p => !p.shaded)).toBe(true);
    expect(piece.every(p => p.shaded)).toBe(true);
    const unit = twiceArea(whole[0]);
    expect(unit).toBeGreaterThan(0);
    expect(picture.pieces.every(p => p.kind === 'triangle' && twiceArea(p) === unit)).toBe(true);
    expect(whole.length).toBeLessThanOrEqual(12);
    expect(piece.length).toBeLessThan(whole.length);
    return { kind: 'reference', fraction: `${piece.length}/${whole.length}` };
  }
  expect(groups).toHaveLength(4);
  const target = prompt.match(/(\d+)\/(\d+)/);
  const half = prompt.includes('as much blue as white');
  if (!target && !half) throw Error('Missing target');
  const [n, d] = target ? target.slice(1).map(Number) : [1, 2];
  const positions = ['Top left', 'Top right', 'Bottom left', 'Bottom right'];
  const labels = groups.flatMap((group, i) => {
    const total = group.reduce((sum, p) => sum + twiceArea(p), 0);
    const blue = group.reduce((sum, p) => sum + (p.shaded ? twiceArea(p) : 0), 0);
    expect(blue).toBeGreaterThan(0);
    expect(blue).toBeLessThan(total);
    return blue * d === total * n ? [positions[i]] : [];
  });
  const pair = prompt.includes('two strips');
  expect(labels).toHaveLength(pair ? 2 : 1);
  expect(groups.some((group, i) => {
    const countMatches = group.filter(p => p.shaded).length * d === group.length * n;
    return countMatches !== labels.includes(positions[i]);
  })).toBe(true);
  return { kind: half ? 'half' : pair ? 'match two' : 'match one', labels };
}

it('solves each visible grid, reference piece and set of strips independently', () => {
  const kinds = new Set<string>();
  for (let seed = -40; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const result = solve({ prompt: q.prompt, picture: q.picture });
      kinds.add(result.kind);
      if (result.labels) {
        if (result.labels.length === 2) {
          expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: ['Top left', 'Top right', 'Bottom left', 'Bottom right'] });
          expect(JSON.parse(q.answer).sort()).toEqual(result.labels.slice().sort());
          const spec = q.structuredResponse;
          if (spec?.kind !== 'named-pair') throw Error('Missing pair selector');
          const matches = result.labels;
          const other = spec.options.find(label => !matches.includes(label));
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(matches.slice().reverse()))).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([matches[0], other]))).toBe(false);
        } else {
          expect(q.choices).toEqual(['Top left', 'Top right', 'Bottom left', 'Bottom right']);
          expect(q.answer).toBe(result.labels[0]);
        }
      } else {
        expect(q.answer).toBe(result.fraction);
        if (result.kind === 'reference') {
          expect(q.choices).toBeUndefined();
          expect(q.structuredResponse).toBeUndefined();
        } else {
          const values = q.choices?.map(choice => {
            const [a, b] = choice.split('/').map(Number);
            return a / b;
          });
          expect(q.choices).toHaveLength(4);
          expect(q.choices).toContain(result.fraction);
          expect(new Set(values).size).toBe(4);
          expect(new Set(q.choices?.map(choice => choice.split('/')[1])).size).toBeGreaterThan(1);
        }
      }
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  }
  expect([...kinds].sort()).toEqual(['half', 'match one', 'match two', 'read blue', 'read white', 'reference']);
});

it('repeats a seed and index exactly and varies the visible task across indices', () => {
  const signatures = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const q = makeRagQuestion(17, i);
    expect(makeRagQuestion(17, i)).toEqual(q);
    signatures.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(signatures.size).toBeGreaterThan(10);
});
