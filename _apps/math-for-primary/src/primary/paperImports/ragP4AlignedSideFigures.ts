import type { Batch11UpperPicture } from './batch11UpperPicture';

type Vertex = [x: number, y: number, labelDx: number, labelDy: number];

function draw(label: string, width: number, height: number, vertices: Record<string, Vertex>, traces: string[]): Batch11UpperPicture {
  const picture: Batch11UpperPicture = { type: 'batch11-upper', label, marks: [] };
  const scale = Math.min(230 / width, 138 / height);
  const x = (u: number) => 160 + (u - width / 2) * scale;
  const y = (v: number) => 100 + (v - height / 2) * scale;

  for (const trace of traces) {
    for (let i = 1; i < trace.length; i++) {
      const [u, v] = vertices[trace[i - 1]];
      const [a, b] = vertices[trace[i]];
      picture.marks.push({ kind: 'line', x1: x(u), y1: y(v), x2: x(a), y2: y(b) });
    }
  }
  for (const [name, [u, v, dx, dy]] of Object.entries(vertices)) {
    picture.marks.push({ kind: 'text', x: x(u) + dx, y: y(v) + dy, text: name });
  }
  return picture;
}

export function besideSquare(side: number, gap: number, length: number): Batch11UpperPicture {
  const height = side + gap;
  const span = length + side;
  return draw(
    'A rectangle stands to the left of a square. G, F and E lie along the bottom from left to right. On the right edge of the rectangle, B is at the top, C is level with the top of the square and F is at the bottom. A is above G and D is above E.',
    span, height, {
      A: [0, 0, -16, -3], B: [length, 0, -4, -7],
      C: [length, gap, 5, -4], D: [span, gap, 5, -3],
      E: [span, height, 5, 15], F: [length, height, -4, 19], G: [0, height, -16, 15],
    }, ['ABCDEFGA', 'CF'],
  );
}

export function belowSquares(side: number, multiple: number): Batch11UpperPicture {
  const height = side * (1 + multiple);
  return draw(
    'Two equal squares sit side by side. P, Q and R are their top corners from left to right. S, T and U lie directly below them. The rectangle shares TU with the right square. V is below T and W is below U.',
    2 * side, height, {
      P: [0, 0, -15, -2], Q: [side, 0, -5, -7], R: [2 * side, 0, 5, -2],
      S: [0, side, -15, 8], T: [side, side, -12, 15], U: [2 * side, side, 5, 7],
      V: [side, height, -14, 16], W: [2 * side, height, 5, 16],
    }, ['PQRUWVTSP', 'QT', 'TU'],
  );
}
