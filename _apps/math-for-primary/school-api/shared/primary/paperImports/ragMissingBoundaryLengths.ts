import {hashString, Rng} from '../../engine/random';
import type {Question} from '../generate';
import {boundaryDiagram, patch, type Point} from './ragBoundaryDiagram';

export const RAG_PATTERN = {
  id: 'p3-missing-boundary-lengths',
  level: 3,
  title: 'Trace a stepped perimeter',
  objective: 'Use matching lengths to find the distance around the requested outline.',
  skillIds: ['P3.S.AREA.02'],
  canonicalPatternId: 'perimeter-from-missing-boundary-lengths',
} as const;

type Steps = NonNullable<Question['workedSteps']>;
type Task = Pick<Question, 'prompt' | 'picture' | 'context' | 'hint'> & {
  unit: 'm' | 'cm'; perimeter: number; steps: Steps; wrong?: number[];
};

function corner(r: Rng, reference: boolean): Task {
  const w = r.int(31, 40), h = r.int(13, 18);
  const foot = r.int(17, 23), drop = r.int(4, h - 4);
  const unit = reference ? 'cm' : 'm';
  const perimeter = 2 * (w + h);
  const label = reference
    ? `Shaded L with its lower left corner missing. The dashed lines complete a rectangle ${w} cm across and ${h} cm high.`
    : `A plot with a step at the lower right. The top is ${w} m long, the left edge is ${h} m high and the bottom is ${foot} m long.`;
  const d = boundaryDiagram(w, h, label);
  const points: Point[] = [[0, 0], [w, 0], [w, drop], [foot, drop], [foot, h], [0, h]];
  d.polygon(reference ? points.map(([x, y]): Point => [w - x, y]) : points, patch);
  d.horizontal(0, w, 0, false, unit);
  d.vertical(0, h, reference ? w : 0, reference, unit);
  const steps: Steps = [];
  if (reference) {
    d.guide([0, drop], [0, h]);
    d.guide([0, h], [w - foot, h]);
    steps.push({text: 'The two shorter horizontal edges together reach as far as the top edge.', equation: `${w} + ${w} = ${2 * w} cm`});
  } else {
    d.horizontal(0, foot, h, true, unit);
    steps.push({text: 'Take the bottom edge away from the top length to find the horizontal step.', equation: `${w} − ${foot} = ${w - foot} m`},
      {text: 'Add all three horizontal edges.', equation: `${w} + ${foot} + ${w - foot} = ${2 * w} m`});
  }
  steps.push({text: 'The two short vertical edges together reach the full height. Count the full-height edge as well.', equation: `${h} + ${h} = ${2 * h} ${unit}`},
    {text: 'Join the horizontal and vertical distances.', equation: `${2 * w} + ${2 * h} = ${perimeter} ${unit}`});
  return {prompt: reference ? 'How many centimetres go around the shaded piece?' : 'How many metres of fencing will enclose this plot?',
    context: [reference ? 'The dashed lines show where the missing corner of the rectangle used to be. Follow the solid edge.' : 'The green plot has a step cut out of one corner. All its edges run across or straight up and down.'],
    picture: d.picture, unit, perimeter, steps,
    hint: 'Trace the short edges. Which ones together reach as far as one long edge?',
    wrong: reference ? undefined : [w + h, perimeter - foot, perimeter + 2 * (w - foot)]};
}

function joinedTiles(r: Rng): Task {
  const n = r.int(3, 5), side = r.int(6, 13), k = r.int(1, n - 2);
  const width = n * side, height = 2 * side;
  const d = boundaryDiagram(width, height, `${n} equal square tiles form a row ${width} cm long. One more sits above tile ${k + 1} in the row.`);
  d.polygon([[0, side], [k * side, side], [k * side, 0], [(k + 1) * side, 0], [(k + 1) * side, side], [width, side], [width, height], [0, height]], patch);
  for (let i = 0; i < n; i++) d.box(i * side, side, side, side);
  d.box(k * side, 0, side, side);
  d.horizontal(0, width, height, true, 'cm');
  const perimeter = 2 * width + 4 * side;
  return {prompt: 'What is the perimeter of the whole tile shape in centimetres?', context: ['The square tiles are all the same size and meet edge to edge.'],
    picture: d.picture, unit: 'cm', perimeter, hint: 'Find one tile side from the bottom row. Trace just the edges on the outside.',
    steps: [
      {text: `The bottom row is ${n} tile sides long. Find one side.`, equation: `${width} ÷ ${n} = ${side} cm`},
      {text: 'The horizontal edges along the top together match the length of the bottom row.', equation: `${width} + ${width} = ${2 * width} cm`},
      {text: 'Count the two ends of the row and both upright edges of the raised tile.', equation: `4 × ${side} = ${4 * side} cm`},
      {text: 'Add the outside lengths.', equation: `${2 * width} + ${4 * side} = ${perimeter} cm`},
    ]};
}

function shadedWall(r: Rng): Task {
  const side = r.int(8, 14), gap = r.int(3, 7);
  const tops = [0];
  for (let i = 1; i < 5; i++) tops.push(tops[i - 1] + r.int(2, 5));
  const clearance = tops[4], height = clearance + side, width = 5 * side + gap;
  const tail = side + gap, span = width - side, perimeter = 2 * (span + height);
  const d = boundaryDiagram(width, height, `Five equal square tiles step down across a rectangular board. The first touches the top left corner. The last rests on the bottom. The patch above and to the right is shaded. The height is ${height} cm. The space below the first tile is ${clearance} cm high. From the left edge of the last tile to the right edge of the board is ${tail} cm.`);
  d.box(0, 0, width, height);
  const stair: Point[] = [[side, 0]];
  for (let i = 1; i < tops.length; i++) stair.push([i * side, tops[i]], [(i + 1) * side, tops[i]]);
  d.polygon([...stair, [5 * side, height], [width, height], [width, 0]], patch);
  tops.forEach((top, i) => d.box(i * side, top, side, side));
  d.vertical(side, height, 0, false, 'cm');
  d.vertical(0, height, width, true, 'cm');
  d.horizontal(4 * side, width, height, true, 'cm');
  return {prompt: 'How many centimetres of trim would go around just the shaded patch?', context: ['Five equal square tiles run from the top left of a board to its bottom edge. The measurement below the board starts at the left edge of the last tile.'],
    picture: d.picture, unit: 'cm', perimeter, wrong: [span + height, perimeter - gap, perimeter + 2 * side],
    hint: 'Use the two height labels to find one tile side. Then trace the top of the shaded patch.',
    steps: [
      {text: 'Subtract the space below the first tile from the board height.', equation: `${height} − ${clearance} = ${side} cm`},
      {text: 'The top of the patch spans the three middle tiles and the whole marked end length.', equation: `3 × ${side} + ${tail} = ${span} cm`},
      {text: 'The horizontal steps and the short bottom edge together match the top.', equation: `${span} + ${span} = ${2 * span} cm`},
      {text: 'The upright steps together match the right edge. Add both heights to the horizontal distance.', equation: `${2 * span} + ${height} + ${height} = ${perimeter} cm`},
    ]};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = r.int(0, 7);
  let task: Task;
  if (variant < 4) task = corner(r, false);
  else if (variant < 6) task = joinedTiles(r);
  else if (variant === 6) task = corner(r, true);
  else task = shadedWall(r);
  const {perimeter, steps, wrong, ...visible} = task;
  return {...visible, key, answer: String(perimeter), workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].join(' ')).join(' '),
    ...(wrong ? {choices: r.shuffle([perimeter, ...wrong].map(String))} : {})};
}
