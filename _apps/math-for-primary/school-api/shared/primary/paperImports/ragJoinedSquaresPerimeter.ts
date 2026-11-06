import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p3-joined-shapes-perimeter',
  level: 3,
  title: 'Around two joined squares',
  objective: 'Find the distance around two joined squares, leaving out the edge they share.',
  skillIds: ['P3.S.AREA.02'],
  canonicalPatternId: 'p3-perimeter-of-joined-shapes',
};

function joinedSquares(big: number, small: number): Batch11UpperPicture {
  const left = 32, base = 168, side = 120, short = side * small / big;
  const join = left + side, end = join + short, high = base - side, low = base - short;
  const line = (x1: number, y1: number, x2: number, y2: number) => ({ kind: 'line' as const, x1, y1, x2, y2 });
  return {
    type: 'batch11-upper',
    label: `Two squares with their bottoms lined up. The whole left side of the ${small} cm square touches the right side of the ${big} cm square.`,
    marks: [
      line(left, high, join, high), line(join, high, join, low),
      line(join, low, end, low), line(end, low, end, base),
      line(end, base, left, base), line(left, base, left, high),
      line(join, low, join, base),
      { kind: 'text', x: left + side / 2 - 18, y: high - 9, text: `${big} cm` },
      { kind: 'text', x: end + 8, y: base - short / 2 + 5, text: `${small} cm` },
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const small = rng.pick([3, 4, 6, 7]);
  const big = rng.pick([7, 9, 10, 11, 12, 13].filter(n => n >= small + 2 && n <= 3 * small));
  const separate = 4 * big + 4 * small;
  const perimeter = separate - 2 * small;
  const workedSteps = [
    { text: 'First go around each square on its own.', equation: `4 × ${big} = ${4 * big} cm; 4 × ${small} = ${4 * small} cm` },
    { text: 'Add those distances. This counts the side where the cards touch on both trips.', equation: `${4 * big} + ${4 * small} = ${separate} cm` },
    { text: 'That side is inside the new shape. Take away its length twice.', equation: `${separate} − ${small} − ${small} = ${perimeter} cm` },
  ];
  return {
    key, context: ['Two square cards lie side by side, as shown.'],
    prompt: 'What is the perimeter of the shape the cards make together?',
    picture: joinedSquares(big, small),
    answer: `${perimeter} cm`,
    choices: rng.shuffle([4 * big, perimeter, separate - small, separate]).map(n => `${n} cm`),
    hint: 'Trace the outside with your finger. Do you pass along the line where the cards touch?',
    workedSteps,
    explanation: workedSteps.map(s => `${s.text} ${s.equation}.`).join(' '),
  };
}
