import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch9EarlyPicture, Batch9Point } from './batch9EarlyPicture';

export const RAG_PATTERN = {
  id: 'p3-shaded-grid-area',
  level: 3,
  title: 'Count the shaded area',
  objective: 'Pair shaded half-squares, count the whole-square equivalents and use the area of one grid square.',
  skillIds: ['P3.S.AREA.01', 'P3.S.AREA.03'],
  canonicalPatternId: 'p3-shaded-area-on-a-square-grid',
};

type Board = Extract<Batch9EarlyPicture, { layout: 'area-fraction' }>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const scaled = ((hashString(String(seed)) + index) & 1) === 1;
  const side = scaled ? r.pick([2, 3]) : 1;
  const cols = r.int(4, 8);
  // Each edge moves by at most one cell between grid lines. Opposite
  // end values give each edge an odd number of halves, hence an even total.
  const insets = () => {
    const start = r.int(0, 1);
    return [start, r.int(0, 1), r.int(0, 1), 1 - start];
  };
  const left = insets(), right = insets();
  const covered = (col: number, line: number) => col >= left[line] && col < cols - right[line];
  const pieces: Board['pieces'] = [];
  let whole = 0, halves = 0;
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col + (8 - cols) / 2;
      const a: Batch9Point = [x, row], b: Batch9Point = [x + 1, row];
      const c: Batch9Point = [x + 1, row + 1], d: Batch9Point = [x, row + 1];
      const top = covered(col, row), bottom = covered(col, row + 1);
      const label = `Row ${row + 1}, column ${col + 1}`;
      if (top === bottom) {
        pieces.push({ label, kind: 'square', points: [a, b, c, d], shaded: top });
        if (top) whole++;
      } else {
        // The shaded half meets the middle of the board on either edge.
        const diagonalAC = (col === 0) === top;
        pieces.push(
          { label: `${label}, upper half`, kind: 'triangle', points: diagonalAC ? [a, b, c] : [a, b, d], shaded: top },
          { label: `${label}, lower half`, kind: 'triangle', points: diagonalAC ? [a, c, d] : [b, c, d], shaded: bottom },
        );
        halves++;
      }
    }
  }
  const equivalents = whole + halves / 2;
  const cellArea = side * side, area = equivalents * cellArea;
  const workedSteps = [
    { text: `Count row by row. There are ${whole} fully shaded squares and ${halves} shaded half-squares.` },
    { text: 'Put the half-squares in pairs. Each pair covers one square.', equation: `${halves} ÷ 2 = ${halves / 2}` },
    { text: 'Add the pairs to the fully shaded squares.', equation: `${whole} + ${halves / 2} = ${equivalents} squares` },
    { text: 'Find the area of one grid square.', equation: `${side} cm × ${side} cm = ${cellArea} cm²` },
    { text: 'Find the area covered by the shading.', equation: `${equivalents} × ${cellArea} cm² = ${area} cm²` },
  ];
  return {
    key, context: [`Each small square on the grid has sides of ${side} cm.`],
    prompt: 'What area does the shaded patch cover?',
    picture: { type: 'batch9-early', layout: 'area-fraction', pieces },
    unit: 'cm²', answer: String(area),
    hint: 'Count the completely shaded squares first. How many more squares can you make by pairing shaded triangles?',
    workedSteps, explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
}
