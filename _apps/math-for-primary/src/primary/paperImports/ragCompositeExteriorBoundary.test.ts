import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import type {GridDrawingPicture, GridPoint} from '../gridDrawingModel';
import {makeRagQuestion, RAG_PATTERN} from './ragCompositeExteriorBoundary';

type Kind = 'joined' | 'repeated' | 'rearranged';
type Rect = {x: number; y: number; width: number; height: number};

function numbers(text: string, pattern: RegExp): number[] {
  const match = text.match(pattern);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match.slice(1).map(Number);
}

// This solver receives only pupil-visible context. It reconstructs the pieces,
// then counts exposed unit edges instead of using the generator's formulas.
function fromVisible(q: Pick<Question, 'context'>): {kind: Kind; rectangles: Rect[]} {
  const text = (q.context ?? []).join(' ');
  if (text.includes('A square card')) {
    const [side] = numbers(text, /square card has side length (\d+) cm/);
    const [multiple] = numbers(text, /rectangular card has length (\d+) times/);
    if (!text.includes('along the whole side') || !text.includes('top and bottom edges line up')) {
      throw new Error('The full shared side must be visible in the givens.');
    }
    return {kind: 'joined', rectangles: [
      {x: 0, y: 0, width: multiple * side, height: side},
      {x: multiple * side, y: 0, width: side, height: side},
    ]};
  }
  if (text.includes('The left piece is a square')) {
    const [side] = numbers(text, /square with side length (\d+) cm/);
    const [long, short] = numbers(text, /upright rectangle is (\d+) cm tall and (\d+) cm wide/);
    if (!text.includes('identical rectangles') || !text.includes('bottom edges on the same straight line')) {
      throw new Error('Congruence and baseline alignment must be visible.');
    }
    if (!(short > 0 && short < side && side < long)) throw new Error('Invalid step lengths.');
    return {kind: 'repeated', rectangles: [
      {x: 0, y: 0, width: side, height: side},
      {x: side, y: 0, width: long, height: short},
      {x: side + long, y: 0, width: short, height: long},
    ]};
  }
  if (text.includes('Sketch A')) {
    const [stacked, flankers] = numbers(text, /Sketch A, (\d+) flat tiles are stacked between (\d+) upright tiles/);
    const [long] = numbers(text, /total height of Sketch A is (\d+) cm/);
    const [upright] = numbers(text, /Sketch B, (\d+) upright tiles stand side by side/);
    if (flankers !== 2 || stacked + flankers !== upright + 2) throw new Error('Tile counts disagree.');
    const short = long / stacked;
    if (!Number.isInteger(short) || short <= 0 || long <= 2 * short) throw new Error('Invalid tile dimensions.');
    const rectangles: Rect[] = Array.from({length: upright}, (_, i) => ({
      x: i * short, y: 0, width: short, height: long,
    }));
    rectangles.push(
      {x: upright * short, y: 0, width: long, height: short},
      {x: upright * short, y: long - short, width: long, height: short},
    );
    return {kind: 'rearranged', rectangles};
  }
  throw new Error('Unknown visible arrangement.');
}

function exposedPerimeter(rectangles: Rect[]): number {
  const cells = new Set<string>();
  for (const rect of rectangles) {
    for (const value of [rect.x, rect.y, rect.width, rect.height]) {
      if (!Number.isInteger(value)) throw new Error('Unit-cell solver needs integer lengths.');
    }
    if (rect.width <= 0 || rect.height <= 0) throw new Error('Non-positive piece.');
    for (let x = rect.x; x < rect.x + rect.width; x++) {
      for (let y = rect.y; y < rect.y + rect.height; y++) {
        const cell = `${x},${y}`;
        if (cells.has(cell)) throw new Error('The visible arrangement overlaps.');
        cells.add(cell);
      }
    }
  }
  let perimeter = 0;
  for (const cell of cells) {
    const [x, y] = cell.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!cells.has(`${x + dx},${y + dy}`)) perimeter++;
    }
  }
  return perimeter;
}

function pictureOf(q: Question): GridDrawingPicture {
  if (q.picture?.type !== 'grid-drawing') throw new Error('Expected a supported grid-drawing picture.');
  return q.picture;
}

// Recover the enclosed tile faces from the actual visible line segments.
// Grid lengths are used only to check sketch topology, never as centimetres.
function faces(picture: GridDrawingPicture): Rect[] {
  const edgeKey = (a: GridPoint, b: GridPoint) => [a.join(','), b.join(',')].sort().join('|');
  const walls = new Set<string>();
  for (const [a, b] of picture.segments) {
    for (const [x, y] of [a, b]) {
      expect(Number.isInteger(x) && Number.isInteger(y)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(picture.columns);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(picture.rows);
    }
    const dx = b[0] - a[0], dy = b[1] - a[1];
    expect((dx === 0) !== (dy === 0)).toBe(true);
    const steps = Math.abs(dx) + Math.abs(dy);
    for (let i = 0; i < steps; i++) {
      walls.add(edgeKey(
        [a[0] + Math.sign(dx) * i, a[1] + Math.sign(dy) * i],
        [a[0] + Math.sign(dx) * (i + 1), a[1] + Math.sign(dy) * (i + 1)],
      ));
    }
  }
  const visited = new Set<string>();
  const result: Rect[] = [];
  for (let startX = 0; startX < picture.columns; startX++) {
    for (let startY = 0; startY < picture.rows; startY++) {
      if (visited.has(`${startX},${startY}`)) continue;
      const pending: GridPoint[] = [[startX, startY]];
      const component: GridPoint[] = [];
      let exterior = false;
      while (pending.length) {
        const [x, y] = pending.pop()!;
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        visited.add(key);
        component.push([x, y]);
        if (x === 0 || y === 0 || x === picture.columns - 1 || y === picture.rows - 1) exterior = true;
        const neighbours: {cell: GridPoint; a: GridPoint; b: GridPoint}[] = [
          {cell: [x - 1, y], a: [x, y], b: [x, y + 1]},
          {cell: [x + 1, y], a: [x + 1, y], b: [x + 1, y + 1]},
          {cell: [x, y - 1], a: [x, y], b: [x + 1, y]},
          {cell: [x, y + 1], a: [x, y + 1], b: [x + 1, y + 1]},
        ];
        for (const next of neighbours) {
          const [nx, ny] = next.cell;
          if (nx >= 0 && nx < picture.columns && ny >= 0 && ny < picture.rows && !walls.has(edgeKey(next.a, next.b))) {
            pending.push(next.cell);
          }
        }
      }
      if (!exterior) {
        const xs = component.map(point => point[0]), ys = component.map(point => point[1]);
        const x = Math.min(...xs), y = Math.min(...ys);
        const width = Math.max(...xs) - x + 1, height = Math.max(...ys) - y + 1;
        expect(component.length).toBe(width * height);
        result.push({x, y, width, height});
      }
    }
  }
  return result.sort((a, b) => a.x - b.x || a.y - b.y);
}

describe('composite exterior boundary candidate', () => {
  it('matches an independent exposed-edge solver across varied visible givens', () => {
    const seen = new Map<Kind, Set<string>>();
    const seeds = [...Array.from({length: 120}, (_, i) => i - 12), 2147483647, 4294967295];
    for (const seed of seeds) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const reconstructed = fromVisible({context: q.context});
        const expected = exposedPerimeter(reconstructed.rectangles);
        expect(q.answer).toBe(String(expected));
        expect(q.unit).toBe('cm');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toContain(`${expected} cm`);
        expect(pictureOf(q).caption).toMatch(/not to scale/);
        expect(q.gridDrawing).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        if (reconstructed.kind === 'joined') {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => choice === String(expected))).toHaveLength(1);
        } else {
          expect(q.choices).toBeUndefined();
        }
        if (!seen.has(reconstructed.kind)) seen.set(reconstructed.kind, new Set());
        seen.get(reconstructed.kind)!.add(JSON.stringify(q.context));
      }
    }
    expect([...seen.keys()].sort()).toEqual(['joined', 'rearranged', 'repeated']);
    for (const variants of seen.values()) expect(variants.size).toBeGreaterThanOrEqual(6);
  });

  it('draws the required pieces, congruence and shared edges using supported pictures', () => {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(0, index);
      const kind = fromVisible({context: q.context}).kind;
      const pieces = faces(pictureOf(q));
      if (kind === 'joined') {
        expect(pieces).toHaveLength(2);
        const [rectangle, square] = pieces;
        expect(square.width).toBe(square.height);
        expect(rectangle.x + rectangle.width).toBe(square.x);
        expect(rectangle.y).toBe(square.y);
        expect(rectangle.height).toBe(square.height);
      } else if (kind === 'repeated') {
        expect(pieces).toHaveLength(3);
        const [square, flat, upright] = pieces;
        expect(square.width).toBe(square.height);
        expect(flat.width).toBe(upright.height);
        expect(flat.height).toBe(upright.width);
        expect(square.x + square.width).toBe(flat.x);
        expect(flat.x + flat.width).toBe(upright.x);
        expect(square.y + square.height).toBe(flat.y + flat.height);
        expect(flat.y + flat.height).toBe(upright.y + upright.height);
      } else {
        expect(pieces).toHaveLength(12);
        const a = pieces.filter(piece => piece.x < 9);
        const b = pieces.filter(piece => piece.x >= 9);
        expect(a).toHaveLength(6);
        expect(b).toHaveLength(6);
        for (const piece of pieces) expect([piece.width, piece.height].sort((x, y) => x - y)).toEqual([1, 4]);
        expect(a.filter(piece => piece.height > piece.width)).toHaveLength(2);
        const uprights = b.filter(piece => piece.height > piece.width);
        const arms = b.filter(piece => piece.width > piece.height).sort((x, y) => x.y - y.y);
        expect(uprights).toHaveLength(4);
        expect(arms).toHaveLength(2);
        for (let i = 1; i < uprights.length; i++) {
          expect(uprights[i - 1].x + uprights[i - 1].width).toBe(uprights[i].x);
          expect(uprights[i].y).toBe(uprights[0].y);
        }
        const rightEdge = Math.max(...uprights.map(piece => piece.x + piece.width));
        expect(arms[0].x).toBe(rightEdge);
        expect(arms[1].x).toBe(rightEdge);
        expect(arms[0].y).toBe(uprights[0].y);
        expect(arms[1].y + arms[1].height).toBe(uprights[0].y + uprights[0].height);
        expect(arms[1].y).toBeGreaterThan(arms[0].y + arms[0].height);
      }
    }
  });

  it('is deterministic, varies by index and declares the intended family and curriculum skill', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-trace-composite-exterior-boundary');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.AREA.02']);
    for (const seed of [-8, 0, 19, 123456]) {
      const kinds = new Set<Kind>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(fromVisible({context: q.context}).kind);
      }
      expect(kinds.size).toBe(3);
    }
    expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  });
});
