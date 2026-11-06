import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p6-remaining-polygon-area',
  level: 6,
  title: 'Area left inside a shape',
  objective: 'Find a remaining area by subtracting the areas of the parts outside it.',
  skillIds: ['P4.S.AREA.02', 'P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p6-remaining-polygon-area',
};

type Point = [number, number];
const path = (points: Point[], fill?: string): Batch11UpperMark => ({
  kind: 'path',
  d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z',
  ...(fill ? {fill} : {}),
});
const text = (x: number, y: number, value: string): Batch11UpperMark => ({kind: 'text', x, y, text: value});
const figure = (label: string, marks: Batch11UpperMark[]): Batch11UpperPicture => ({type: 'batch11-upper', label, marks});
const shaded = '#dcefe6';

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`${RAG_PATTERN.id}:${seed}`) + Math.trunc(index)) % 2 + 2) % 2;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    // A positive gap keeps the opposite-corner removals separate.
    const small = r.pick([3, 5, 6, 7]);
    const side = 2 * small + r.pick([6, 8, 10]);
    const wholeArea = side * side;
    const oneCut = small * small;
    const removed = 2 * oneCut;
    const answer = wholeArea - removed;
    const steps = [
      `Before cutting, the card has area ${side} × ${side} = ${wholeArea} cm².`,
      `Each small square has area ${small} × ${small} = ${oneCut} cm². The two pieces have total area 2 × ${oneCut} = ${removed} cm².`,
      `The area kept is ${wholeArea} − ${removed} = ${answer} cm².`,
    ];
    const x = 90, y = 30, size = 140, cut = size * small / side;
    const remaining: Point[] = [
      [x + cut, y], [x + size, y],
      [x + size, y + size - cut], [x + size - cut, y + size - cut],
      [x + size - cut, y + size], [x, y + size],
      [x, y + cut], [x + cut, y + cut],
    ];
    return {
      key,
      context: [
        `A square card has sides of ${side} cm.`,
        `Two matching square pieces, each with sides of ${small} cm, are cut from opposite corners.`,
        'The unshaded corner squares A and B are the pieces removed. The shaded part is kept.',
      ],
      prompt: 'Choose the area of the card that is kept.',
      answer: String(answer),
      choices: r.shuffle([answer, removed, wholeArea - oneCut, wholeArea - 2 * small].map(String)),
      unit: 'cm²',
      hint: 'Work out the area of the whole card and the total area of both pieces removed.',
      workedSteps: steps.map(text => ({text})),
      explanation: steps.join(' '),
      picture: figure(
        `A square of side ${side} cm has two unshaded squares A and B of side ${small} cm at its top-left and bottom-right corners. The rest is shaded.`,
        [
          path(remaining, shaded),
          path([[x, y], [x + size, y], [x + size, y + size], [x, y + size]]),
          text(143, 20, `${side} cm`),
          text(x + cut / 2 - 5, y + cut / 2 + 5, 'A'),
          text(x + size - cut / 2 - 5, y + size - cut / 2 + 5, 'B'),
        ],
      ),
    };
  }

  // Each row gives height, width, bottom inset, inner slope, outer slope.
  // Consistent whole-number lengths are supplied; pupils do not need Pythagoras.
  const dimensions: [number, number, number, number, number][] = [
    [12, 16, 5, 13, 20],
    [12, 16, 9, 15, 20],
    [15, 20, 8, 17, 25],
    [20, 21, 15, 25, 29],
    [24, 32, 10, 26, 40],
    [24, 32, 18, 30, 40],
    [30, 40, 16, 34, 50],
  ];
  const [h, w, d, inner, outer] = r.pick(dimensions);
  const multiplier = r.pick([1, 2]);
  const height = h * multiplier, width = w * multiplier, inset = d * multiplier;
  const innerLength = inner * multiplier, outerLength = outer * multiplier;
  const rectangleArea = width * height;
  const upperArea = rectangleArea / 2;
  const leftArea = inset * height / 2;
  const answer = rectangleArea - upperArea - leftArea;
  const steps = [
    `The rectangle has area ${width} × ${height} = ${rectangleArea} cm².`,
    `Triangle ABC has perpendicular sides AB and BC, so its area is ½ × ${width} × ${height} = ${upperArea} cm².`,
    `AD = BC = ${height} cm. Triangle ADE has area ½ × ${inset} × ${height} = ${leftArea} cm².`,
    `Take away both unshaded triangles: ${rectangleArea} − ${upperArea} − ${leftArea} = ${answer} cm².`,
  ];
  const scale = Math.min(208 / width, 128 / height);
  const drawingWidth = width * scale, drawingHeight = height * scale;
  const x = (320 - drawingWidth) / 2, y = 35;
  const right = x + drawingWidth, bottom = y + drawingHeight, ex = x + inset * scale;
  return {
    key,
    context: [
      'ABCD is a rectangle. E lies on side DC, between D and C.',
      `AB = ${width} cm, BC = ${height} cm and DE = ${inset} cm.`,
      `AE = ${innerLength} cm and AC = ${outerLength} cm. The triangle AEC is shaded.`,
    ],
    prompt: 'Work out the shaded area of triangle AEC.',
    answer: String(answer),
    unit: 'cm²',
    hint: 'Subtract the areas of the two unshaded triangles from the rectangle. Use perpendicular heights.',
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' ') + ' AE and AC are sloping sides, not perpendicular heights for bases on DC.',
    picture: figure(
      `Rectangle ABCD has A at the top left, B at the top right, C at the bottom right and D at the bottom left. E is on DC with DE ${inset} cm. AB is ${width} cm and BC is ${height} cm. Lines AE and AC enclose the shaded triangle AEC. AE is ${innerLength} cm and AC is ${outerLength} cm.`,
      [
        path([[x, y], [ex, bottom], [right, bottom]], shaded),
        path([[x, y], [right, y], [right, bottom], [x, bottom]]),
        text(x - 16, y - 5, 'A'), text(right + 4, y - 5, 'B'),
        text(right + 5, bottom + 15, 'C'), text(x - 16, bottom + 15, 'D'),
        text(ex - 4, bottom + 15, 'E'),
        text(144, y - 12, `${width} cm`),
        text(right + 9, y + drawingHeight / 2 + 4, `${height} cm`),
        text(x + inset * scale / 2 - 12, bottom + 32, `${inset} cm`),
      ],
    ),
  };
}
