import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { besideSquare, belowSquares } from './ragP4AlignedSideFigures';

export const RAG_PATTERN = {
  id: 'rag-p4-aligned-square-rectangle-sides',
  level: 4,
  title: 'Find a missing side in joined shapes',
  objective: 'Use equal sides of squares and opposite sides of rectangles to follow a length through a joined figure.',
  skillIds: ['P4.S.SHAPE.01'],
  canonicalPatternId: 'p4-aligned-square-rectangle-sides-with-offset-or-multiple',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const target = rng.pick(['AG', 'UW', 'AB', 'DE'] as const);

  function question(picture: Batch11UpperPicture, context: string[], value: number, other: number[], hint: string, steps: string[]): Question {
    return {
      key, context, picture, prompt: `How long is ${target} in centimetres?`,
      unit: 'cm', answer: String(value), choices: rng.shuffle([value, ...other].map(String)),
      hint, workedSteps: steps.map(text => ({ text })), explanation: steps.join(' '),
    };
  }

  if (target === 'UW') {
    const side = rng.int(7, 13);
    const multiple = rng.int(2, 4);
    const longSide = side * multiple;
    return question(belowSquares(side, multiple), [
      'PQTS and QRUT are identical squares.',
      `PQ = ${side} cm. The long side of rectangle TUWV is ${multiple} times as long as its short side.`,
    ], longSide, [side, side + multiple, longSide + side],
      'Which edge does the rectangle share with the square above it?', [
        `The squares are the same size, so TU is as long as PQ. Both measure ${side} cm.`,
        `TU is the short side of the rectangle. Its long side UW measures ${multiple} × ${side} = ${longSide} cm.`,
      ]);
  }

  const side = rng.int(11, 16);
  const gap = rng.int(4, 7);
  const height = side + gap;
  const length = height + rng.int(4, 10);
  const span = length + side;
  const picture = besideSquare(side, gap, length);
  const shapes = 'ABFG is a rectangle. CDEF is a square.';

  if (target === 'AG') {
    return question(picture, [shapes, `CD = ${side} cm and BC = ${gap} cm.`],
      height, [side, gap, height + gap], 'Look for the two parts of BF.', [
        `CF and CD are sides of the square, so CF measures ${side} cm.`,
        `BF runs from B through C to F. Its length is ${gap} + ${side} = ${height} cm.`,
        `AG is opposite BF in the rectangle, so AG also measures ${height} cm.`,
      ]);
  }

  if (target === 'AB') {
    return question(picture, [shapes, `AG = ${height} cm, BC = ${gap} cm and GE = ${span} cm.`],
      length, [side, span - height, span - gap], 'First find how much of BF lies beside the square.', [
        `BF is as long as AG. Take away BC to get CF. CF measures ${height} − ${gap} = ${side} cm.`,
        `The bottom edge FE of the square also measures ${side} cm.`,
        `Take FE away from GE. That leaves GF, which is as long as AB. AB measures ${span} − ${side} = ${length} cm.`,
      ]);
  }

  return question(picture, [shapes, `GE = ${span} cm and AB = ${length} cm.`],
    side, [length, span, span + length], 'Which part of GE lies under the rectangle?', [
      `GF is opposite AB, so GF measures ${length} cm.`,
      `FE is the part of GE that is left. FE measures ${span} − ${length} = ${side} cm.`,
      `DE and FE are sides of the same square, so DE measures ${side} cm.`,
    ]);
}
