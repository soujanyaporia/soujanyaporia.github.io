import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-shaded-square-arrangements',
  level: 5,
  title: 'Shaded areas in square arrangements',
  objective: 'Use square sides and midpoint relationships to find and combine triangle areas.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'shaded-area-in-square-arrangements',
};

type Point = [number, number];
type Polygon = Point[];
type Step = NonNullable<Question['workedSteps']>[number];
const SHADE = '#a7cbb7';
const square = (x: number, side: number): Polygon =>
  [[x, 0], [x + side, 0], [x + side, side], [x, side]];

/** All coordinates describe visible geometry, in centimetres before scaling. */
function diagram(
  width: number, height: number, outlines: Polygon[], shaded: Polygon[],
  dimensions: {x: number; value: number}[], label: string,
): Batch11UpperPicture {
  const scale = Math.min(240 / width, 130 / height);
  const left = (320 - width * scale) / 2;
  const project = ([x, y]: Point): Point => [left + x * scale, 162 - y * scale];
  const path = (points: Polygon, fill: string): Batch11UpperMark => ({
    kind: 'path',
    d: points.map((point, i) => {
      const [x, y] = project(point);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z',
    fill,
  });
  const marks: Batch11UpperMark[] = [
    ...shaded.map(points => path(points, SHADE)),
    ...outlines.map(points => path(points, 'none')),
    ...dimensions.map(({x, value}): Batch11UpperMark => ({
      kind: 'text', x: left + x * scale - 20, y: 188, text: `${value} cm`,
    })),
  ];
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const finish = (
    prompt: string, context: string[], answer: number,
    picture: Batch11UpperPicture, hint: string, workedSteps: Step[],
    choices?: string[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, context, answer: String(answer), unit: 'cm²', picture, hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    const side = r.pick([8, 12, 14, 16, 18, 20, 22, 24]);
    const half = side / 2, quarter = side / 4;
    const outer = square(0, side);
    const tilted: Polygon = [[half, side], [side, half], [half, 0], [0, half]];
    const inner: Polygon = [
      [quarter, quarter], [3 * quarter, quarter],
      [3 * quarter, 3 * quarter], [quarter, 3 * quarter],
    ];
    const shaded: Polygon[] = [
      [[half, side], [quarter, 3 * quarter], [3 * quarter, 3 * quarter]],
      [[side, half], [3 * quarter, 3 * quarter], [3 * quarter, quarter]],
      [[half, 0], [3 * quarter, quarter], [quarter, quarter]],
      [[0, half], [quarter, quarter], [quarter, 3 * quarter]],
    ];
    const corner = half * half / 2, middleArea = side * side - 4 * corner;
    const innerArea = half * half, answer = middleArea - innerArea;
    return finish(
      'Find the total area of the four shaded triangles.',
      [
        `The outer square has side ${side} cm.`,
        'The tilted square joins the midpoints of the outer square’s sides. A midpoint divides a side into two equal lengths.',
        'The smallest square joins the midpoints of the tilted square’s sides.',
        'The four triangles inside the tilted square but outside the smallest square are shaded.',
      ],
      answer,
      diagram(side, side, [outer, tilted, inner], shaded, [{x: half, value: side}],
        `Three nested squares. The outer side is ${side} cm. Each inner square joins the previous square’s side midpoints. The four triangles between the two inner squares are shaded.`),
      'Find the tilted square’s area, then subtract the smallest square’s area.',
      [
        {text: 'Find the area of the outer square.', equation: `${side} × ${side} = ${side * side} cm²`},
        {text: 'Each outer corner triangle has a base and perpendicular height equal to half the outer side.', equation: `${side} ÷ 2 = ${half} cm; ${half} × ${half} ÷ 2 = ${corner} cm²`},
        {text: 'Remove the four outer corner triangles to find the tilted square.', equation: `${side * side} − 4 × ${corner} = ${middleArea} cm²`},
        {text: 'The smallest square’s top corners are halfway along the two upper sloping sides. Its width is half the outer side.', equation: `${side} ÷ 2 = ${half} cm; ${half} × ${half} = ${innerArea} cm²`},
        {text: 'Subtract the smallest square from the tilted square.', equation: `${middleArea} − ${innerArea} = ${answer} cm²`},
      ],
    );
  }

  if (variant === 1) {
    const large = r.int(6, 15);
    const small = r.int(Math.ceil(large * 0.4), Math.floor(large * 0.75));
    const answer = small * large / 2;
    const shaded: Polygon = [[0, large], [large, 0], [large + small, 0]];
    const choices = r.shuffle([...new Set([
      answer, small * large, large * large / 2,
      (large + small) * large / 2, large * large + small * small,
    ])].slice(0, 4).map(String));
    return finish(
      'Choose the area of the shaded triangle.',
      [
        `The left square has side ${large} cm. The right square has side ${small} cm.`,
        'The squares touch side by side, with their bottom edges on the same straight line.',
        'The shaded triangle joins the top-left corner of the left square to both bottom corners of the right square.',
      ],
      answer,
      diagram(large + small, large, [square(0, large), square(large, small)], [shaded],
        [{x: large / 2, value: large}, {x: large + small / 2, value: small}],
        `Two squares stand side by side on one baseline, left side ${large} cm and right side ${small} cm. The shaded triangle joins the top-left corner of the left square to the two bottom corners of the right square.`),
      'Use the smaller square’s bottom edge as the base. Measure the height to the whole baseline.',
      [
        {text: 'The base is the bottom side of the smaller square.', equation: `Base = ${small} cm`},
        {text: 'Both squares stand on the same line. The larger square’s side gives the perpendicular height, even though it is outside the shaded triangle.', equation: `Height = ${large} cm`},
        {text: 'Multiply the base by the perpendicular height, then halve it.', equation: `${small} × ${large} ÷ 2 = ${answer} cm²`},
      ],
      choices,
    );
  }

  const left = r.int(4, 8), middle = left + r.int(4, 7), right = left + r.int(1, 3);
  const width = left + middle + right;
  const shaded: Polygon = [
    [0, left], [left, left], [left, middle], [width, 0], [left + middle, 0],
  ];
  const squareArea = left * left;
  const upperTriangle = (middle + right) * middle / 2;
  const lowerTriangle = (left + middle) * left / 2;
  const answer = squareArea + upperTriangle - lowerTriangle;
  return finish(
    'Find the area of the shaded region.',
    [
      `The left, middle and right squares have sides ${left} cm, ${middle} cm and ${right} cm, respectively.`,
      'The squares touch side by side, with all three bottom edges on the same straight line.',
      'One sloping line joins the top-left corner of the middle square to the bottom-right corner of the right square.',
      'Another joins the top-left corner of the left square to the bottom-right corner of the middle square.',
      'The shading is below the first sloping line and the top of the left square, and above the second sloping line and the bottom of the right square.',
    ],
    answer,
    diagram(width, middle,
      [square(0, left), square(left, middle), square(left + middle, right)],
      [shaded],
      [{x: left / 2, value: left}, {x: left + middle / 2, value: middle}, {x: left + middle + right / 2, value: right}],
      `Three squares stand in a row on one baseline with sides ${left}, ${middle} and ${right} cm. The shaded boundary runs from the left square’s top-left corner along its top edge, up to the middle square’s top-left corner, diagonally to the right square’s bottom-right corner, left along its base, then diagonally back to the start.`),
    'Combine the left square and the large triangle under the upper sloping line. Then remove the lower unshaded triangle.',
    [
      {text: 'Start with the whole left square.', equation: `${left} × ${left} = ${squareArea} cm²`},
      {text: 'The large triangle stretches across the middle and right squares. Its height is the middle square’s side.', equation: `(${middle} + ${right}) × ${middle} ÷ 2 = ${upperTriangle} cm²`},
      {text: 'The lower unshaded triangle stretches across the left and middle squares. Its height is the left square’s side.', equation: `(${left} + ${middle}) × ${left} ÷ 2 = ${lowerTriangle} cm²`},
      {text: 'Add the square and large triangle, then subtract the lower triangle.', equation: `${squareArea} + ${upperTriangle} − ${lowerTriangle} = ${answer} cm²`},
    ],
  );
}
