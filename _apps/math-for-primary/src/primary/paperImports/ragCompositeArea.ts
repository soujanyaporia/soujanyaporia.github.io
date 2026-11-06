import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { GridSegment } from '../gridDrawingModel';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'rag-p3-composite-area',
  level: 3,
  title: 'Find the area of a whole or a part',
  objective: 'Use a rectangle, its tiles or its shaded parts to find a missing area by adding or subtracting.',
  skillIds: ['P3.S.AREA.03', 'P3.S.AREA.01', 'P3.S.AREA.02', 'P3.S.AS.01'],
  canonicalPatternId: 'composite-area-by-addition-or-subtraction',
};

type Steps = NonNullable<Question['workedSteps']>;
type Panel = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>;

function tilePlan(cols: number, bands: number): NonNullable<Question['picture']> {
  const rows = bands + 1;
  const segments: GridSegment[] = [];
  for (let y = 0; y <= rows; y++) segments.push([[0, y], [cols, y]]);
  segments.push([[0, 0], [0, rows]], [[cols, 0], [cols, rows]]);
  for (let x = 1; x < cols; x++) segments.push([[x, 0], [x, x === cols - 1 ? rows : 1]]);
  return { type: 'grid-drawing', columns: cols, rows, segments, caption: 'Tile edges in the rectangular panel' };
}

// The full row of white squares establishes the widths of both end strips.
// Each strip is split along a diagonal; its coloured half meets the coloured middle.
function patchwork(middle: number, height: number): Panel {
  const cols = middle + 2;
  const step = 3 / (height + 1);
  const pieces: Panel['pieces'] = [];
  function piece(label: string, kind: 'square' | 'triangle', shaded: boolean, vertices: Batch9Point[]) {
    const points: Batch9Point[] = vertices.map(([x, y]) => [4 + (x - cols / 2) * step, y * step]);
    pieces.push({ label, kind, shaded, points });
  }
  function tile(x: number, y: number, shaded: boolean) {
    piece(`Row ${y + 1}, column ${x + 1}`, 'square', shaded, [[x,y],[x+1,y],[x+1,y+1],[x,y+1]]);
  }
  for (let x = 0; x < cols; x++) tile(x, height, false);
  for (let y = 0; y < height; y++) for (let x = 1; x <= middle; x++) tile(x, y, true);
  piece('Left strip, next to the middle', 'triangle', true, [[0,0],[1,0],[1,height]]);
  piece('Left strip, next to the bottom row', 'triangle', false, [[0,0],[1,height],[0,height]]);
  piece('Right strip, next to the middle', 'triangle', true, [[cols-1,0],[cols,0],[cols-1,height]]);
  piece('Right strip, next to the bottom row', 'triangle', false, [[cols,0],[cols,height],[cols-1,height]]);
  return { type: 'batch9-early', layout: 'area-fraction', pieces };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = ((hashString(String(seed)) % 5 + index) % 5 + 5) % 5;
  function make(prompt: string, context: string[], answer: number, hint: string, workedSteps: Steps, picture?: Question['picture']): Question {
    return { key, prompt, context, answer: String(answer), unit: 'cm²', hint, workedSteps,
      explanation: workedSteps.map(s => `${s.text} ${s.equation}`).join(' '), ...(picture ? { picture } : {}) };
  }

  if (slot < 2) {
    const length = r.pick([10, 11, 13, 14, 15]), breadth = r.pick([6, 8, 9]);
    const side = r.int(2, Math.min(5, breadth - 2));
    const whole = length * breadth, left = whole - side * side;
    return make('What area does the cut-out square cover?', [
      `Leela has a rectangular sheet of felt. It is ${length} cm long and ${breadth} cm wide.`,
      `She cuts out one square. The felt left over has an area of ${left} cm².`,
    ], whole - left, 'Find the area of the felt before Leela cut it. Which part is still there?', [
      { text: 'Find the area of the whole sheet.', equation: `${length} × ${breadth} = ${whole} cm²` },
      { text: 'Take away the area of the felt that is left. The rest is the square.', equation: `${whole} − ${left} = ${whole - left} cm²` },
    ]);
  }

  if (slot === 2) {
    const side = r.int(3, 5), cols = r.int(3, 6), bands = r.int(2, 3);
    const squares = cols + bands, long = (cols - 1) * side;
    const squareArea = squares * side * side, stripArea = bands * long * side;
    return make('What is the area of the tiled panel?', [
      `The panel has ${squares} equal square tiles and ${bands} equal long tiles. They fit together with no gaps.`,
      `Each square tile has a perimeter of ${4 * side} cm. The lines show the edges of the tiles.`,
    ], squareArea + stripArea, 'Find one side of a square. Look along the top row to see how far a long tile reaches.', [
      { text: 'A square has four equal sides. Divide its perimeter by four.', equation: `${4 * side} ÷ 4 = ${side} cm` },
      { text: 'Find the area covered by all the square tiles.', equation: `${side} × ${side} = ${side * side} cm²; ${squares} × ${side * side} = ${squareArea} cm²` },
      { text: `Each long tile spans ${cols - 1} top-row squares and is one square high.`, equation: `${cols - 1} × ${side} = ${long} cm` },
      { text: 'Find the area of one long tile, then of all the long tiles.', equation: `${long} × ${side} = ${long * side} cm²; ${bands} × ${long * side} = ${stripArea} cm²` },
      { text: 'Add the two areas. Each tile is counted once.', equation: `${squareArea} + ${stripArea} = ${squareArea + stripArea} cm²` },
    ], tilePlan(cols, bands));
  }

  const side = r.int(2, 3), h = side === 3 ? 2 : r.int(2, 3), middle = r.int(2, 5);
  const height = h * side, midWidth = middle * side;
  const centre = midWidth * height, ends = side * height, shaded = centre + ends;
  const steps: Steps = [
    { text: 'Count the squares across and down the shaded middle to find its dimensions.', equation: `${middle} × ${side} = ${midWidth} cm; ${h} × ${side} = ${height} cm` },
    { text: 'Find the area of this middle rectangle.', equation: `${midWidth} × ${height} = ${centre} cm²` },
    { text: 'The two shaded end triangles fit together to make one strip, one square wide and as tall as the middle.', equation: `${side} × ${height} = ${ends} cm²` },
    { text: 'Add the middle and the two ends.', equation: `${centre} + ${ends} = ${shaded} cm²` },
  ];
  const unshaded = slot === 4, width = (middle + 2) * side, boardHeight = height + side, whole = width * boardHeight;
  if (unshaded) steps.push(
    { text: 'Count the bottom row for the full width. Include that row in the height as well.', equation: `${middle + 2} × ${side} = ${width} cm; ${h + 1} × ${side} = ${boardHeight} cm` },
    { text: 'Find the area of the board, then take away the shaded patch.', equation: `${width} × ${boardHeight} = ${whole} cm²; ${whole} − ${shaded} = ${whole - shaded} cm²` },
  );
  return make(unshaded ? 'How much of the board is unshaded?' : 'What area does the shaded patch cover?',
    [`Each small square on this rectangular board has sides of ${side} cm.`],
    unshaded ? whole - shaded : shaded,
    unshaded ? 'Find the shaded area first. How much of the whole board is left?' : 'Look at the shaded middle. What rectangle could you make by joining the two shaded ends?',
    steps, patchwork(middle, h));
}
