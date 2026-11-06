import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch9EarlyPicture } from './batch9EarlyPicture';
import { makeRagQuestion } from './ragShadingAPartitionedWhole';

type Tile = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>['pieces'][number];
type Givens = Pick<Question, 'prompt' | 'picture' | 'choices' | 'fractionBuilder'>;

function area(tile: Tile) {
  const twice = tile.points.reduce((sum, [x, y], i, points) => {
    const [u, v] = points[(i + 1) % points.length];
    return sum + x * v - y * u;
  }, 0);
  return Math.abs(twice) / 2;
}

function bounds(tiles: Tile[]) {
  const vertices = tiles.flatMap(t => t.points);
  const xs = vertices.map(([x]) => x);
  const ys = vertices.map(([, y]) => y);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
}

// Separate the visible rectangles at the horizontal gaps, without using tile labels.
function rectangles(tiles: Tile[]) {
  const sorted = [...tiles].sort((a, b) => bounds([a]).left - bounds([b]).left);
  const groups: Tile[][] = [];
  let right = -Infinity;
  for (const tile of sorted) {
    const box = bounds([tile]);
    if (box.left > right) groups.push([]);
    groups[groups.length - 1].push(tile);
    right = Math.max(right, box.right);
  }
  return groups.map(group => {
    const box = bounds(group);
    const whole = (box.right - box.left) * (box.bottom - box.top);
    const shaded = group.reduce((sum, tile) => sum + (tile.shaded ? area(tile) : 0), 0);
    expect(group.every(tile => area(tile) > 0)).toBe(true);
    expect(group.reduce((sum, tile) => sum + area(tile), 0)).toBeCloseTo(whole, 10);
    expect(shaded).toBeGreaterThan(0);
    expect(shaded).toBeLessThan(whole);
    return { group, whole, shaded };
  });
}

function fractionIn(text: string) {
  const match = text.match(/(\d+)\/(\d+)/);
  if (!match) throw Error('Expected a visible fraction');
  const n = Number(match[1]), d = Number(match[2]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(d);
  expect(d).toBeLessThanOrEqual(12);
  return { n, d };
}

function solve({ prompt, picture, choices, fractionBuilder }: Givens) {
  if (fractionBuilder !== undefined) {
    const { n, d } = fractionIn(prompt);
    expect(fractionBuilder).toBe(d);
    expect(choices).toBeUndefined();
    return { mode: 'shade', answer: `${n}/${d}` };
  }
  if (picture?.type !== 'batch9-early' || picture.layout !== 'area-fraction') throw Error('Missing rectangle diagram');
  const figures = rectangles(picture.pieces);
  expect(choices).toHaveLength(4);
  if (prompt.includes('unshaded')) {
    const { n, d } = fractionIn(prompt);
    expect(figures).toHaveLength(4);
    const positions = ['First', 'Second', 'Third', 'Fourth'];
    expect(choices).toEqual(positions);
    const matches = figures.filter(f => (f.whole - f.shaded) * d === f.whole * n);
    expect(matches).toHaveLength(1);
    expect(matches[0].group.filter(t => t.kind === 'triangle' && !t.shaded)).toHaveLength(2);
    const shadedMatches = figures.filter(f => f.shaded * d === f.whole * n);
    expect(shadedMatches).toHaveLength(1);
    expect(shadedMatches[0]).not.toBe(matches[0]);
    return { mode: 'match', answer: positions[figures.indexOf(matches[0])] };
  }

  expect(figures).toHaveLength(1);
  const [{ whole, shaded, group }] = figures;
  const areas = group.map(area);
  const unit = Math.min(...areas);
  const totalSquares = whole / unit;
  const shadedSquares = shaded / unit;
  expect(Number.isInteger(totalSquares) && totalSquares <= 12).toBe(true);
  expect(Number.isInteger(shadedSquares)).toBe(true);
  const options = (choices ?? []).map(option => ({ option, ...fractionIn(option) }));
  expect(new Set(options.map(({ n, d }) => n / d)).size).toBe(4);
  const matches = options.filter(({ n, d }) => n * whole === d * shaded);
  expect(matches).toHaveLength(1);
  const [{ option, n, d }] = matches;
  const joined = areas.some(a => a > unit);
  if (joined) {
    expect(areas.filter(a => a !== unit)).toEqual([4 * unit]);
    expect(d).toBeLessThan(totalSquares);
  } else {
    expect([n, d]).toEqual([shadedSquares, totalSquares]);
  }
  return { mode: joined ? 'joined' : 'full grid', answer: option };
}

it('solves the visible choices and the colouring task across seeds and indices', () => {
  const modes = new Set<string>();
  for (let seed = -12; seed <= 20; seed++) {
    for (let index = 0; index < 11; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solve(q);
      modes.add(expected.mode);
      expect(q.answer).toBe(expected.answer);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  }
  expect([...modes].sort()).toEqual(['full grid', 'joined', 'match', 'shade']);
});

it('reproduces a question and changes the actual givens across indices', () => {
  const seen = new Set<string>();
  for (let index = 0; index < 22; index++) {
    const q = makeRagQuestion(57, index);
    expect(makeRagQuestion(57, index)).toEqual(q);
    seen.add(JSON.stringify([q.prompt, q.picture, q.fractionBuilder]));
  }
  expect(seen.size).toBeGreaterThan(11);
});
