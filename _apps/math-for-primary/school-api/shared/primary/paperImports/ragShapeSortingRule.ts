import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-shape-sorting-rule',
  level: 1,
  title: 'How were the shapes sorted?',
  objective: 'Compare sets of shapes and identify the features used to sort them.',
  skillIds: ['P1.S.SHAPE.01'],
  canonicalPatternId: 'p1-identify-sorting-rule',
};

type Tile = {
  shape: 'circle' | 'square' | 'triangle';
  size: 'small' | 'large';
  colour: 'white' | 'blue';
};
type Feature = keyof Tile;
type Pairs = { [K in Feature]: Tile[K][] };
const features: Feature[] = ['shape', 'size', 'colour'];
const letters = ['A', 'B', 'C', 'D'];

function makeSet(r: Rng, count: number, pairs: Pairs, fixed: Feature[], side: number): Tile[] {
  function values<K extends Feature>(key: K): Tile[K][] {
    const pair = pairs[key];
    if (fixed.includes(key)) return Array<Tile[K]>(count).fill(pair[side]);
    return r.shuffle(Array.from({ length: count }, (_, i) => pair[i % 2]));
  }
  const shapes = values('shape');
  const sizes = values('size');
  const colours = values('colour');
  return shapes.map((shape, i) => ({shape, size: sizes[i], colour: colours[i]}));
}

function tileMark(tile: Tile, x: number, y: number, half: number, turns: number): Batch11UpperMark {
  const fill = tile.colour === 'white' ? 'white' : 'royalblue';
  if (tile.shape === 'circle') return {kind: 'circle', cx: x, cy: y, r: half, fill};
  const corners = tile.shape === 'triangle'
    ? [[0, -1], [1, 1], [-1, 1]]
    : [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const path = corners.map(([dx, dy], i) => {
    for (let n = 0; n < turns; n++) [dx, dy] = [-dy, dx];
    return (i === 0 ? 'M' : 'L') + (x + dx * half) + ' ' + (y + dy * half);
  });
  return {kind: 'path', d: path.join(' ') + ' Z', fill};
}

function drawSets(sets: Tile[][], r: Rng): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  const rowHeight = 200 / sets.length;
  const half = {small: r.int(7, 9), large: r.int(15, 17)};
  const descriptions = sets.map((set, row) => {
    const y = rowHeight * (row + 0.5);
    if (row > 0) marks.push({kind: 'line', x1: 8, y1: rowHeight * row, x2: 312, y2: rowHeight * row});
    marks.push({kind: 'text', x: 12, y: y + 6, text: letters[row]});
    set.forEach((tile, i) => {
      const x = Math.round(44 + (i + 0.5) * 264 / set.length);
      marks.push(tileMark(tile, x, y, half[tile.size], r.int(0, 3)));
    });
    return 'Set ' + letters[row] + ': ' + set.map(t => [t.size, t.colour, t.shape].join(' ')).join(', ') + '.';
  });
  return {type: 'batch11-upper', label: descriptions.join(' '), marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = RAG_PATTERN.id + ':' + seed + ':' + index;
  const r = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) % 4 + index) % 4 + 4) % 4;
  const shapes = r.shuffle(['square', 'triangle', 'circle'] as const).slice(0, 2);
  const pairs: Pairs = {
    shape: shapes,
    colour: r.shuffle(['blue', 'white'] as const),
    size: r.shuffle(['large', 'small'] as const),
  };
  const count = r.pick([3, 5]);
  if (variant === 3) {
    const rules = r.shuffle<Feature[]>([['shape'], ['colour'], ['size'], []]);
    const sets = rules.map(rule => makeSet(r, count, pairs, rule, r.int(0, 1)));
    const at = rules.findIndex(rule => rule.includes('shape'));
    const answer = letters[at];
    const steps = [
      {text: 'Set ' + answer + ' has only ' + sets[at][0].shape + 's. Each other set has two kinds of shape.'},
      {text: 'Set ' + answer + ' has both colours and both sizes. Only the shape stays the same.'},
    ];
    return {
      key, prompt: 'Which set has just one kind of shape, with different sizes and colours?',
      picture: drawSets(sets, r), choices: [...letters], answer,
      hint: 'Check all the pieces in each row. Look for one shape that appears in both colours and both sizes.',
      workedSteps: steps, explanation: steps.map(s => s.text).join(' '),
    };
  }

  const two = variant === 2;
  const fixed: Feature[] = two ? r.shuffle(features).slice(0, 2) : [variant === 0 ? 'size' : 'shape'];
  const sets = [0, 1].map(side => makeSet(r, count, pairs, fixed, side));
  const observations: Record<Feature, string> = {
    shape: 'A has only ' + pairs.shape[0] + 's. B has only ' + pairs.shape[1] + 's.',
    size: 'Every piece in A is ' + pairs.size[0] + '. Every piece in B is ' + pairs.size[1] + '.',
    colour: 'Every piece in A is ' + pairs.colour[0] + '. Every piece in B is ' + pairs.colour[1] + '.',
  };
  const shared: Record<Feature, string> = {
    shape: 'Both sets contain ' + pairs.shape[0] + 's and ' + pairs.shape[1] + 's.',
    size: 'Both sets contain small and large pieces.',
    colour: 'Both sets contain blue and white pieces.',
  };
  const steps = [
    ...fixed.map(f => ({text: observations[f]})),
    ...features.filter(f => !fixed.includes(f)).map(f => ({text: shared[f]})),
    {text: 'The pieces are sorted by ' + fixed.join(' and ') + '.'},
  ];
  const options = r.shuffle(features);
  return {
    key, prompt: two ? 'Which two things tell Set A and Set B apart? Pick two words.'
      : 'What tells Set A and Set B apart? Pick one word.',
    picture: drawSets(sets, r),
    ...(two ? {structuredResponse: {kind: 'named-pair' as const, options}} : {choices: options}),
    answer: two ? JSON.stringify(fixed) : fixed[0],
    hint: 'Look at what all the pieces in A share. Then check what all the pieces in B share.',
    workedSteps: steps, explanation: steps.map(s => s.text).join(' '),
  };
}
