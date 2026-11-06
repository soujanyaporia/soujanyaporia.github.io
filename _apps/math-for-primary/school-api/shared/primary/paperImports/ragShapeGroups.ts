import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1s-rag-shape-groups',
  level: 1,
  title: 'Which shapes belong together?',
  objective: 'Compare the sides and corners of shapes, even when the shapes are turned or have different sizes.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p1-shapes-with-a-shared-property',
};

type Point = [number, number];
const outlines = {
  narrow: [[-21, 7], [13, -12], [20, 7]],
  right: [[-14, -14], [19, 13], [-14, 13]],
  wide: [[-20, 11], [-2, -14], [19, 11]],
  square: [[-13, -13], [13, -13], [13, 13], [-13, 13]],
  long: [[-21, -8], [21, -8], [21, 8], [-21, 8]],
  short: [[-16, -11], [16, -11], [16, 11], [-16, 11]],
  pentagon: [[0, -17], [16, -4], [10, 14], [-10, 14], [-16, -4]],
  hexagon: [[-16, -8], [0, -17], [16, -8], [16, 8], [0, 17], [-16, 8]],
} satisfies Record<string, Point[]>;
type Tile = keyof typeof outlines | 'circle';

function straightSides(tile: Tile) {
  return tile === 'circle' ? 0 : outlines[tile].length;
}

function drawTile(picture: Batch11UpperPicture, tile: Tile, x: number, y: number,
  degrees: number, scale: number, label?: string) {
  if (tile === 'circle') {
    picture.marks.push({ kind: 'circle', cx: x, cy: y, r: 15 * scale });
  } else {
    const angle = degrees * Math.PI / 180;
    const cos = Math.cos(angle) * scale;
    const sin = Math.sin(angle) * scale;
    const d = outlines[tile].map(([u, v], i) => {
      const px = (x + u * cos - v * sin).toFixed(2);
      const py = (y + u * sin + v * cos).toFixed(2);
      return (i === 0 ? 'M' : 'L') + px + ' ' + py;
    }).join(' ') + ' Z';
    picture.marks.push({ kind: 'path', d });
  }
  if (label) picture.marks.push({ kind: 'text', x: x - 6, y: y + 39, text: label });
}

function description(tile: Tile) {
  const sides = straightSides(tile);
  if (sides === 0) return 'a round outline with no corners';
  if (sides === 4) return 'four straight sides and four square corners';
  return sides + ' straight sides';
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = RAG_PATTERN.id + ':' + seed + ':' + index;
  const rng = new Rng(hashString(key));
  const mode = rng.pick(['extend-one', 'extend-two', 'find-pair'] as const);
  const pair = mode === 'find-pair';
  const single = mode === 'extend-one';
  const sides = rng.pick([3, 4]);
  const examples: Tile[] = sides === 3 ? ['narrow', 'wide', 'right'] : ['long', 'square', 'short'];
  const members: Tile[] = sides === 3 ? rng.shuffle(examples).slice(0, 2) : ['square', rng.pick(['long', 'short'] as const)];
  const other: Tile = sides === 3 ? 'short' : 'right';
  const distractors: Tile[] = [other, 'circle', 'pentagon', 'hexagon'];
  const tiles = rng.shuffle([
    ...members.slice(0, single ? 1 : 2),
    ...rng.shuffle(distractors).slice(0, pair || single ? 4 : 3),
  ]);
  const labels = tiles.map((_, i) => String.fromCharCode(65 + i));
  const picture: Batch11UpperPicture = { type: 'batch11-upper', label: '', marks: [] };
  const notes: string[] = [];
  if (!pair) {
    const row = rng.shuffle(examples);
    row.forEach((tile, i) => drawTile(picture, tile, 66 + i * 94, 46, [0, 90, -25][i], [0.85, 1.15, 1][i]));
    picture.marks.push({ kind: 'line', x1: 12, y1: 90, x2: 308, y2: 90 });
    notes.push('Top row, from left to right: ' + row.map(description).join('; ') + '.');
  }
  tiles.forEach((tile, i) => {
    const x = pair ? 56 + (i % 3) * 104 : 32 + i * 64;
    const y = pair && i < 3 ? 45 : 138;
    const turn = tile === 'square' ? rng.pick([20, 35, 55]) : rng.pick([0, 75, 110, 180, 260]);
    drawTile(picture, tile, x, y, turn, rng.int(8, 11) / 10, labels[i]);
    notes.push(labels[i] + ' has ' + description(tile) + '.');
  });
  picture.label = notes.join(' ');

  const matches = labels.filter((_, i) => straightSides(tiles[i]) === sides);
  const matched = matches.join(' and ');
  const rule = sides === 3 ? 'three straight sides' : 'four straight sides and four square corners';
  const first = pair
    ? 'Count the straight sides of each shape. ' + tiles.map((tile, i) => labels[i] + ' has ' + straightSides(tile)).join(', ') + '.'
    : 'Each shape in the top row has ' + rule + '. Turning a shape keeps its sides and corners the same.';
  const last = matched + (single ? ' has ' : ' both have ') + rule + '.';
  return {
    key, picture,
    prompt: pair ? 'Which two letters mark shapes with the same number of straight sides?'
      : single ? 'Which shape in the bottom row belongs with the shapes in the top row?'
      : 'Which two shapes in the bottom row belong with the shapes in the top row?',
    hint: 'Trace the edge of each shape. Count its straight sides as you go round.',
    answer: single ? matches[0] : JSON.stringify(matches),
    ...(single ? { choices: labels } : { structuredResponse: { kind: 'named-pair' as const, options: labels } }),
    workedSteps: [{ text: first }, { text: last }],
    explanation: first + ' ' + last,
  };
}
