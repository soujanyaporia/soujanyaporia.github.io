import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import { gridDrawingValue, type GridPoint, type GridSegment } from '../gridDrawingModel';

export const RAG_PATTERN = {
  id: 'rag-p4-finish-grid-outlines',
  level: 4,
  title: 'Finish a square or rectangle on dots',
  objective: 'Use right angles and matching side lengths to draw the missing sides.',
  skillIds: ['P4.S.SHAPE.02', 'P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-complete-squares-and-rectangles-from-given-grid-sides',
};

type Variant = 'one-side-square' | 'two-side-square' | 'two-side-rectangle';

// Return the shared corner and the tips of its two adjacent sides.
function placeSides(rng: Rng, size: number, variant: Variant): [GridPoint, GridPoint, GridPoint] {
  if (variant === 'one-side-square') {
    const [across, up] = rng.pick([[2, 1], [2, 2], [3, 1], [4, 1], [4, 2], [4, 3]] as const);
    const x = rng.int(up, size - across);
    const y = size - 1;
    // The other quarter-turn would put the next corner below the bottom row.
    return [[x, y], [x + across, y - up], [x - up, y - across]];
  }
  const side = rng.int(1, 3);
  const [left, right] = variant === 'two-side-square' ? [side, side]
    : rng.pick([[1, 2], [1, 3], [2, 4], [3, 4], [4, 1]] as const);
  const x = rng.int(left, size - right);
  const y = rng.int(0, size - left - right);
  return [[x, y], [x - left, y + left], [x + right, y + right]];
}

function move(from: GridPoint, to: GridPoint): string {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const gaps = (n: number) => Math.abs(n) + (Math.abs(n) === 1 ? ' space' : ' spaces');
  return gaps(dx) + (dx > 0 ? ' right' : ' left') + ' and ' + gaps(dy) + (dy > 0 ? ' down' : ' up');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['one-side-square', 'two-side-square', 'two-side-rectangle'] as const);
  const oneSide = variant === 'one-side-square';
  const shape = variant === 'two-side-rectangle' ? 'rectangle' : 'square';
  const size = rng.int(8, 9);
  const turns = rng.int(0, 3);
  const rotate = ([x, y]: GridPoint): GridPoint => {
    for (let i = 0; i < turns; i++) [x, y] = [size - y, x];
    return [x, y];
  };
  const [a, b, d] = placeSides(rng, size, variant).map(rotate);
  const c: GridPoint = [b[0] + d[0] - a[0], b[1] + d[1] - a[1]];
  const given: GridSegment[] = [[a, b]];
  const missing: GridSegment[] = [[b, c], [c, d]];
  if (oneSide) missing.push([d, a]);
  else given.push([a, d]);

  const prompt = oneSide
    ? 'Copy the blue line onto the matching dots on your grid. Use it as one side of a square. Draw the other three sides so the square fits on the grid.'
    : `Copy the two blue lines onto the matching dots on your grid. Use them as sides of a ${shape}. Draw the two missing sides.`;
  const steps = oneSide ? [
    `From the ${a[0] < b[0] ? 'left' : 'right'} end of the blue line, count ${move(a, b)} to reach its other end.`,
    `Turn this move through a right angle. To stay on the grid, go ${move(a, d)}. This gives a side of the same length.`,
    'Make that move from both ends of the copied line. Draw those two sides, then join their tips.',
  ] : [
    `Start where the blue lines meet. One side goes ${move(a, b)}. The other goes ${move(a, d)}.`,
    `From the tip of the first side, go ${move(a, d)} to find the missing corner. Draw that side.`,
    'Join the new corner to the other free end. Each new side runs in the same direction as its opposite side and is just as long.',
  ];
  return {
    key, prompt,
    gridDrawing: { kind: 'copy-grid', columns: size, rows: size, referenceSegments: given },
    answer: gridDrawingValue([...given, ...missing]),
    hint: oneSide ? 'Think of turning the blue line through a right angle at one end. Which way leaves room on the grid?'
      : 'Trace one side with your finger. Try the same move from the far end of the other side.',
    explanation: steps.join(' '),
    workedSteps: steps.map((text, i) => i === steps.length - 1 ? {
      text,
      picture: { type: 'grid-drawing', columns: size, rows: size, givenSegments: given, segments: missing },
    } : { text }),
  };
}
