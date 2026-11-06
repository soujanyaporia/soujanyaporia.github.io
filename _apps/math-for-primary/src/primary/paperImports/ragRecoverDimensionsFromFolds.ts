import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperPicture} from './batch11UpperPicture';

type Point = [number, number];
type Fold =
  | {kind: 'one'; width: number; upright: number}
  | {kind: 'two'; width: number; middle: number; left: number; right: number}
  | {kind: 'midpoint'; width: number};

export const RAG_PATTERN = {
  id: 'rag-p5-recover-dimensions-from-folds',
  level: 5,
  title: 'Open out a folded strip',
  objective: 'Use equal lengths and midpoint relationships in folded strips to recover their original dimensions and areas.',
  skillIds: ['P3.S.AREA.03', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-recover-dimensions-from-folds',
} as const;

function drawing(outline: Point[], label: string) {
  const xs = outline.map(p => p[0]);
  const ys = outline.map(p => p[1]);
  const loX = Math.min(...xs), hiX = Math.max(...xs);
  const loY = Math.min(...ys), hiY = Math.max(...ys);
  const scale = Math.min(160 / (hiX - loX), 104 / (hiY - loY));
  const screen = ([x, y]: Point): Point => [
    160 + (x - (loX + hiX) / 2) * scale,
    90 + (y - (loY + hiY) / 2) * scale,
  ];
  const path = (points: Point[]) => 'M ' + points.map(p => p.join(' ')).join(' L ');
  const model: Batch11UpperPicture = {
    type: 'batch11-upper',
    label,
    marks: [{kind: 'path', d: path(outline.map(screen)) + ' Z', fill: '#ffffff'}],
  };
  function stroke(a: Point, b: Point, dashed = false) {
    model.marks.push({kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], dashed});
  }
  function line(a: Point, b: Point, dashed = false) {
    stroke(screen(a), screen(b), dashed);
  }
  function text(value: string, point: Point, dx = 0, dy = 0) {
    const [x, y] = screen(point);
    model.marks.push({kind: 'text', x: x + dx, y: y + dy, text: value});
  }
  function horizontal(a: Point, b: Point, value: number, offset: number) {
    const p = screen(a), q = screen(b), y = p[1] + offset;
    stroke([p[0], y], [q[0], y]);
    for (const x of [p[0], q[0]]) stroke([x, y - 3], [x, y + 3]);
    const caption = value + ' cm';
    model.marks.push({kind: 'text', x: (p[0] + q[0]) / 2 - caption.length * 4.4,
      y: y + (offset < 0 ? -6 : 20), text: caption});
  }
  function vertical(a: Point, b: Point, value: number, side: -1 | 1) {
    const p = screen(a), q = screen(b), x = p[0] + side * 12;
    stroke([x, p[1]], [x, q[1]]);
    for (const y of [p[1], q[1]]) stroke([x - 3, y], [x + 3, y]);
    model.marks.push({kind: 'text', x: x + (side < 0 ? -61 : 7),
      y: (p[1] + q[1]) / 2 + 6, text: value + ' cm'});
  }
  function rightAngle(corner: Point, sx: -1 | 1, sy: -1 | 1) {
    const [x, y] = screen(corner);
    model.marks.push({kind: 'path', d: path([
      [x + sx * 6, y], [x + sx * 6, y + sy * 6], [x, y + sy * 6],
    ])});
  }
  function tick(point: Point, onVerticalEdge: boolean) {
    const [x, y] = screen(point);
    stroke([x - (onVerticalEdge ? 4 : 0), y - (onVerticalEdge ? 0 : 4)],
      [x + (onVerticalEdge ? 4 : 0), y + (onVerticalEdge ? 0 : 4)]);
  }
  return {model, line, text, horizontal, vertical, rightAngle, tick};
}

function foldedPicture(fold: Fold): Batch11UpperPicture {
  const w = fold.width;
  if (fold.kind === 'one') {
    const h = fold.upright;
    const d = drawing([[-w, 0], [0, 0], [0, -h], [w, -h], [w, 0], [0, w], [-w, w]],
      'One folded end. A short arm points left and a longer arm points up. The sloping edge is the fold; dashed lines mark the two short sides of the triangular overlap.');
    d.line([0, 0], [w, 0], true);
    d.line([0, 0], [0, w], true);
    d.rightAngle([0, 0], 1, 1);
    d.horizontal([0, -h], [w, -h], w, -12);
    d.horizontal([-w, w], [0, w], w, 12);
    d.vertical([w, -h], [w, 0], h, 1);
    return d.model;
  }
  if (fold.kind === 'two') {
    const {middle: m, left: l, right: r} = fold;
    const d = drawing([[-w, w], [0, 0], [m, 0], [m, -r], [m + w, -r],
      [m + w, 0], [m, w], [0, w], [0, w + l], [-w, w + l]],
      'Both ends are folded. A horizontal middle joins a downward left arm and an upward right arm. Each sloping edge is a fold. Dashed lines mark the triangular overlaps.');
    d.line([-w, w], [0, w], true);
    d.line([0, 0], [0, w], true);
    d.line([m, 0], [m + w, 0], true);
    d.line([m, 0], [m, w], true);
    d.rightAngle([0, w], -1, -1);
    d.rightAngle([m, 0], 1, 1);
    d.horizontal([0, 0], [m, 0], m, -12);
    d.horizontal([-w, w + l], [0, w + l], w, 12);
    d.vertical([-w, w], [-w, w + l], l, -1);
    d.vertical([m + w, -r], [m + w, 0], r, 1);
    return d.model;
  }
  const d = drawing([[-w, w], [0, 0], [2 * w, 0], [2 * w, w],
    [0, w], [0, 2 * w], [-w, 2 * w]],
    'A is the upper end of the diagonal fold. B is directly below A at the dashed horizontal line, and C is the bottom of the folded end directly below B. The four sides of the lower square have matching marks.');
  d.line([-w, w], [0, w], true);
  d.line([0, 0], [0, w], true);
  d.rightAngle([0, w], -1, -1);
  d.tick([-w / 2, w], false);
  d.tick([-w / 2, 2 * w], false);
  d.tick([-w, 1.5 * w], true);
  d.tick([0, 1.5 * w], true);
  d.text('A', [0, 0], -8, -9);
  d.text('B', [0, w], 8, 18);
  d.text('C', [0, 2 * w], 8, 5);
  d.horizontal([-w, 2 * w], [0, 2 * w], w, 12);
  return d.model;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(RAG_PATTERN.id + ':' + seed + ':' + index));
  const variant = (hashString(String(seed)) % 3 + ((Math.trunc(index) % 3) + 3) % 3) % 3;
  const width = rng.pick([5, 6, 7, 8, 10, 11]);
  const common = 'The strip is ' + width + ' cm wide throughout.';
  const note = 'The sketch is not for measuring. Each sloping edge is a fold line.';
  let fold: Fold;
  let context: string[];
  let length: number;
  let hint: string;
  let workedSteps: NonNullable<Question['workedSteps']>;
  if (variant === 0) {
    const upright = rng.int(17, 27);
    fold = {kind: 'one', width, upright};
    length = width + width + upright;
    context = [
      'One end of a paper strip is folded upwards, turning the strip through a right angle.',
      common,
      'The straight left-hand part is ' + width + ' cm long.',
      'The straight upright part is ' + upright + ' cm long.',
      'The dashed lines mark the short sides of the triangular overlap.',
      note,
    ];
    hint = 'Imagine opening the fold. What length is restored between the two straight parts?';
    workedSteps = [
      {text: 'The two short sides of the overlap each equal the strip width. Opening the fold restores a square between the straight parts.', equation: 'Length restored = ' + width + ' cm'},
      {text: 'Join the two straight lengths and the restored length.', equation: width + ' + ' + width + ' + ' + upright + ' = ' + length + ' cm'},
    ];
  } else if (variant === 1) {
    const middle = rng.pick([13, 15, 16, 18, 20]);
    const left = rng.pick([6, 7, 11, 13, 14]);
    const right = rng.pick([5, 6, 7, 11, 12]);
    fold = {kind: 'two', width, middle, left, right};
    length = left + width + middle + width + right;
    context = [
      'Both ends of a paper strip are folded, one downwards and one upwards. Each fold turns the strip through a right angle.',
      common,
      'The straight middle part is ' + middle + ' cm long.',
      'The short outer edge on the left is ' + left + ' cm long.',
      'The short outer edge on the right is ' + right + ' cm long.',
      'The dashed lines mark the short sides of the two triangular overlaps.',
      note,
    ];
    hint = 'Open both folds in your mind. Include the strip-width length restored at each bend.';
    workedSteps = [
      {text: 'Each bend opens into a square whose side is the strip width.', equation: 'Length restored by both folds = 2 × ' + width + ' = ' + (2 * width) + ' cm'},
      {text: 'Add the three straight lengths outside the bends.', equation: left + ' + ' + middle + ' + ' + right + ' = ' + (left + middle + right) + ' cm'},
      {text: 'Include the lengths restored by both folds.', equation: (left + middle + right) + ' + ' + (2 * width) + ' = ' + length + ' cm'},
    ];
  } else {
    fold = {kind: 'midpoint', width};
    length = 4 * width;
    context = [
      'A is a point on a long edge of a paper strip. Before folding, A marked the midpoint of that edge.',
      'The left end is folded down through a right angle, as shown. The part below the dashed horizontal line is a square.',
      common,
      'A, B and C lie on one straight line. C is the end of the long edge that was folded.',
      'Matching marks show equal lengths.',
      note,
    ];
    hint = 'Find AB and BC from the strip width and the square. Use the midpoint to recover the full length.';
    workedSteps = [
      {text: 'AB spans the strip width. BC is a side of the lower square, so it has the same length.', equation: 'AB = BC = ' + width + ' cm'},
      {text: 'Folding keeps lengths unchanged. AC is half of the original long edge.', equation: width + ' + ' + width + ' = ' + (2 * width) + ' cm'},
      {text: 'A was the midpoint, so double this half-length.', equation: '2 × ' + (2 * width) + ' = ' + length + ' cm'},
    ];
  }
  const area = length * width;
  workedSteps.push({text: 'Multiply the original length by the width.', equation: length + ' × ' + width + ' = ' + area + ' cm²'});
  return {
    key: RAG_PATTERN.id + ':' + seed + ':' + index,
    prompt: 'Find the area of the strip when it is opened out flat.',
    context,
    answer: String(area),
    unit: 'cm²',
    picture: foldedPicture(fold),
    hint,
    workedSteps,
    explanation: workedSteps.map(step => step.text + ' ' + (step.equation ?? '')).join(' '),
  };
}
