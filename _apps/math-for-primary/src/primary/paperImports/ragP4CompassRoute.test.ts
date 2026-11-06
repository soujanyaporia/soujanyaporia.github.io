import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4CompassRoute';

type Cell = { x: number; y: number };
type Move = { count: number; dx: number; dy: number };
const compass: Record<string, [number, number]> = {
  east: [1, 0], west: [-1, 0], north: [0, -1], south: [0, 1],
};

function readMap(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw Error('Missing map');
  const lines = picture.marks.filter(m => m.kind === 'line');
  const horizontal = lines.filter(l => l.y1 === l.y2);
  const ys = horizontal.map(l => l.y1).sort((a, b) => a - b);
  const vertical = lines.filter(l => l.x1 === l.x2 && l.y1 === ys[0] && l.y2 === ys[ys.length - 1]);
  const xs = vertical.map(l => l.x1).sort((a, b) => a - b);
  expect(Math.min(xs.length, ys.length)).toBeGreaterThan(3);
  const gap = xs[1] - xs[0];
  expect(gap).toBeGreaterThan(0);
  for (const axis of [xs, ys]) axis.slice(1).forEach((n, i) => expect(n - axis[i]).toBe(gap));
  for (const line of horizontal) expect([line.x1, line.x2]).toEqual([xs[0], xs[xs.length - 1]]);
  const texts = picture.marks.filter(m => m.kind === 'text');
  const north = texts.find(m => m.text === 'N');
  const shaft = lines.find(l => l.x1 > xs[xs.length - 1] && l.x1 === l.x2 && l.y2 < l.y1);
  if (!north || !shaft) throw Error('Missing north arrow');
  expect(north.y).toBeLessThan(shaft.y2);
  expect(Math.abs(north.x - shaft.x2)).toBeLessThan(gap / 2);
  const tip = lines.filter(l => l.x2 === shaft.x2 && l.y2 === shaft.y2 && l.y1 > shaft.y2);
  expect(tip.some(l => l.x1 < shaft.x2) && tip.some(l => l.x1 > shaft.x2)).toBe(true);

  const dots = picture.marks.filter(m => m.kind === 'circle');
  const stops = new Map<string, Cell>();
  for (const label of texts.filter(t => t !== north)) {
    const near = dots.filter(d => Math.hypot(d.cx - label.x, d.cy - label.y) < gap / 2);
    expect(near).toHaveLength(1);
    const cell = { x: xs.indexOf(near[0].cx), y: ys.indexOf(near[0].cy) };
    expect(Math.min(cell.x, cell.y)).toBeGreaterThanOrEqual(0);
    stops.set(label.text, cell);
  }
  expect(stops.size).toBe(dots.length);
  expect(new Set([...stops.values()].map(p => `${p.x},${p.y}`)).size).toBe(stops.size);
  return { stops, width: xs.length, height: ys.length };
}

function readMoves(instructions: string[], initial?: string): Move[] {
  let facing = initial ? compass[initial] : undefined;
  return instructions.map(line => {
    const direct = /^Walk (\d+) steps? (north|east|south|west)\.$/.exec(line);
    if (direct) {
      expect(initial).toBeUndefined();
      const [dx, dy] = compass[direct[2]];
      return { count: Number(direct[1]), dx, dy };
    }
    const forward = /^(?:Walk|Make a quarter turn (clockwise|anticlockwise), then walk) forward (\d+) steps?\.$/.exec(line);
    if (!forward || !facing) throw Error(`Cannot trace ${line}`);
    const [x, y] = facing;
    if (forward[1] === 'clockwise') facing = [-y, x];
    if (forward[1] === 'anticlockwise') facing = [y, -x];
    return { count: Number(forward[2]), dx: facing[0], dy: facing[1] };
  });
}

it('solves from the printed map and walking instructions', () => {
  const variants = new Set<string>();
  const maps = new Set<string>();
  for (let seed = -5; seed < 35; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const { stops, width, height } = readMap(q);
      const [scale, clue, order, ...instructions] = q.context ?? [];
      expect(scale).toMatch(/one side of a grid square counts as one step/);
      expect(order).toContain('in order');
      const known = /^Jia (starts|finishes) at ([A-Z])(?:, facing (north|east|south|west))?\.$/.exec(clue);
      if (!known) throw Error('Missing known stop');
      const reverse = known[1] === 'finishes';
      expect(q.prompt).toContain(reverse ? 'begin' : 'finish');
      expect(stops.has(known[2])).toBe(true);
      const moves = readMoves(instructions, known[3]);
      expect([2, 3]).toContain(moves.length);
      for (const move of moves) {
        expect(move.count).toBeGreaterThanOrEqual(1);
        expect(move.count).toBeLessThanOrEqual(4);
      }
      // For a missing start, try the printed route forwards from every labelled stop.
      const matches: string[] = [];
      for (const [label, cell] of stops) {
        if (!reverse && label !== known[2]) continue;
        let { x, y } = cell;
        let onMap = true;
        for (const move of moves) {
          for (let step = 0; step < move.count; step++) {
            x += move.dx;
            y += move.dy;
            if (x < 0 || x >= width || y < 0 || y >= height) onMap = false;
          }
        }
        if (!onMap) continue;
        const end = [...stops].find(([, p]) => p.x === x && p.y === y)?.[0];
        if (reverse && end === known[2]) matches.push(label);
        if (!reverse && end) matches.push(end);
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      if (reverse || known[3] || moves.length === 2) expect(q.choices).toBeDefined();
      else expect(q.choices).toBeUndefined();
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(matches[0]);
        q.choices.forEach(s => expect(stops.has(s)).toBe(true));
      }
      expect(q.workedSteps).toHaveLength(moves.length + 1);
      variants.add(reverse ? 'reverse' : known[3] ? 'turns' : q.choices ? 'forward choice' : 'forward entry');
      maps.add(JSON.stringify(q.picture));
    }
  }
  expect(variants).toEqual(new Set(['reverse', 'turns', 'forward choice', 'forward entry']));
  expect(maps.size).toBeGreaterThan(40);
});

it('reproduces a route for the same seed and index', () => {
  for (const seed of [0, 1, 17, -31]) {
    for (const index of [0, 2, 5]) expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
  }
});
