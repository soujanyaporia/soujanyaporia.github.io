import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {GridDrawingPicture, GridPoint, GridSegment} from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'p5-composite-exterior-boundary',
  level: 5,
  title: 'Trace joined shapes',
  objective: 'Find missing lengths in joined shapes and add only the edges on their outside boundary.',
  skillIds: ['P4.S.AREA.02'],
  canonicalPatternId: 'p5-trace-composite-exterior-boundary',
};

function closed(points: GridPoint[]): GridSegment[] {
  return points.map((point, i): GridSegment => [point, points[(i + 1) % points.length]]);
}

function joinedPicture(): GridDrawingPicture {
  return {
    type: 'grid-drawing', columns: 11, rows: 5,
    segments: [
      ...closed([[1, 1], [10, 1], [10, 4], [1, 4]]),
      [[7, 1], [7, 4]],
    ],
    caption: 'The rectangle is on the left and the square is on the right. Sketch not to scale; use the stated lengths.',
  };
}

function repeatedPicture(): GridDrawingPicture {
  return {
    type: 'grid-drawing', columns: 14, rows: 8,
    segments: [
      ...closed([[1, 3], [5, 3], [5, 5], [11, 5], [11, 1], [13, 1], [13, 7], [1, 7]]),
      [[5, 5], [5, 7]],
      [[11, 5], [11, 7]],
    ],
    caption: 'A square on the left, a flat rectangle in the middle and an upright rectangle on the right. Sketch not to scale; use the stated lengths.',
  };
}

function rearrangedPicture(): GridDrawingPicture {
  return {
    type: 'grid-drawing', columns: 19, rows: 6,
    segments: [
      ...closed([[1, 1], [7, 1], [7, 5], [1, 5]]),
      [[2, 1], [2, 5]], [[6, 1], [6, 5]],
      [[2, 2], [6, 2]], [[2, 3], [6, 3]], [[2, 4], [6, 4]],
      ...closed([[10, 1], [18, 1], [18, 2], [14, 2], [14, 4], [18, 4], [18, 5], [10, 5]]),
      [[11, 1], [11, 5]], [[12, 1], [12, 5]], [[13, 1], [13, 5]],
      [[14, 1], [14, 2]], [[14, 4], [14, 5]],
    ],
    caption: 'Sketch A is on the left. Sketch B is on the right. Sketches not to scale; use the stated lengths.',
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const finish = (
    context: string[], prompt: string, answer: number,
    hint: string, workedSteps: NonNullable<Question['workedSteps']>,
    picture: GridDrawingPicture, choices?: string[],
  ): Question => ({
    key, context, prompt, answer: String(answer), unit: 'cm', hint,
    picture, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    const side = r.pick([4, 6, 7, 8, 9, 12, 14]);
    const multiple = r.int(2, 4);
    const length = side * multiple;
    const width = length + side;
    const perimeter = 2 * (width + side);
    return finish(
      [
        `A square card has side length ${side} cm.`,
        `A rectangular card has length ${multiple} times the side length of the square.`,
        'The rectangle is joined to the left of the square along the whole side. Their top and bottom edges line up, and the cards do not overlap.',
      ],
      'What is the perimeter of the joined shape? Choose the length in centimetres.',
      perimeter,
      'Find the full width. Count the outside edges; the line where the cards meet is inside the shape.',
      [
        {text: 'The rectangle has the same height as the square. Find its length.', equation: `${multiple} × ${side} = ${length} cm`},
        {text: 'Add the widths of the two cards.', equation: `${length} + ${side} = ${width} cm`},
        {text: 'The outside is a rectangle. Add its two horizontal and two vertical sides.', equation: `2 × (${width} + ${side}) = ${perimeter} cm`},
      ],
      joinedPicture(),
      r.shuffle([perimeter, 2 * (length + side), perimeter + 2 * side, 4 * side].map(String)),
    );
  }

  if (variant === 1) {
    const short = r.int(3, 5);
    const side = short + r.int(3, 6);
    const long = side + r.int(4, 8);
    const leftStep = side - short;
    const rightStep = long - short;
    const bottom = side + long + short;
    const perimeter = 4 * (side + long);
    const edges = [side, leftStep, long, rightStep, short, long, bottom, side];
    return finish(
      [
        `The left piece is a square with side length ${side} cm.`,
        'The other two pieces are identical rectangles. One lies flat between the square and the upright rectangle.',
        `The upright rectangle is ${long} cm tall and ${short} cm wide.`,
        'All three pieces have their bottom edges on the same straight line. Neighbouring pieces touch along an edge, with no overlap.',
      ],
      'Find the perimeter of the whole shape.',
      perimeter,
      'Use the identical rectangles to find the height of the flat piece. Then find the two exposed steps.',
      [
        {text: 'Turning a rectangle does not change its side lengths.', equation: `Flat rectangle: ${long} cm long and ${short} cm high`},
        {text: 'Subtract the flat rectangle’s height to find the two exposed vertical steps.', equation: `${side} − ${short} = ${leftStep} cm; ${long} − ${short} = ${rightStep} cm`},
        {text: 'The bottom edge runs beneath all three pieces.', equation: `${side} + ${long} + ${short} = ${bottom} cm`},
        {text: 'Start at the top-left corner of the square and follow the outside boundary. Leave out the two joining lines.', equation: `${edges.join(' + ')} = ${perimeter} cm`},
      ],
      repeatedPicture(),
    );
  }

  const breadth = r.pick([2, 3, 4, 6, 7, 8]);
  const length = 4 * breadth;
  const across = 4 * breadth + length;
  const recess = length - 2 * breadth;
  const perimeter = 6 * length + 8 * breadth;
  const edges = [across, breadth, length, recess, length, breadth, across, length];
  return finish(
    [
      'Six identical rectangular tiles are placed edge to edge without gaps or overlaps in each sketch.',
      'In Sketch A, 4 flat tiles are stacked between 2 upright tiles. Their top and bottom edges line up.',
      `The total height of Sketch A is ${length} cm.`,
      'In Sketch B, 4 upright tiles stand side by side. One flat tile extends to the right at the top, and the other extends to the right at the bottom, as shown.',
    ],
    'What is the perimeter of Sketch B?',
    perimeter,
    'In Sketch A, four tile breadths match one tile length. In Sketch B, include the edges inside the open recess.',
    [
      {text: 'An upright tile reaches from the bottom to the top of Sketch A, so its length equals the total height.', equation: `Tile length = ${length} cm`},
      {text: 'Four flat tiles fill that height. Divide to find one tile’s breadth.', equation: `${length} ÷ 4 = ${breadth} cm`},
      {text: 'In Sketch B, each full top or bottom edge crosses four upright tiles and one flat tile.', equation: `4 × ${breadth} + ${length} = ${across} cm`},
      {text: 'The vertical edge at the back of the recess excludes the top and bottom tile breadths.', equation: `${length} − ${breadth} − ${breadth} = ${recess} cm`},
      {text: 'Trace all eight outside edges, including the three edges of the recess. Do not count the joining lines.', equation: `${edges.join(' + ')} = ${perimeter} cm`},
    ],
    rearrangedPicture(),
  );
}
