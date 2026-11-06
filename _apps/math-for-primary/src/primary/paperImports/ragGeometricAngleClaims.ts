import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-geometric-angle-claims',
  level: 5,
  title: 'Check angle statements',
  objective: 'Use triangle sums and vertically opposite angles to identify a statement that must be true.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.03', 'P5.S.SHAPE.01'],
  canonicalPatternId: 'p5-evaluate-geometric-angle-claims',
} as const;

type Point = readonly [number, number];
const line = (a: Point, b: Point): Batch11UpperMark => ({
  kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1],
});
const text = (p: Point, value: string): Batch11UpperMark => ({
  kind: 'text', x: p[0], y: p[1], text: value,
});

// Trigonometry is used only to draw the minor angle arcs.
function arc(vertex: Point, first: Point, second: Point): Batch11UpperMark {
  const start = Math.atan2(first[1] - vertex[1], first[0] - vertex[0]);
  let turn = Math.atan2(second[1] - vertex[1], second[0] - vertex[0]) - start;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn < -Math.PI) turn += 2 * Math.PI;
  const d = Array.from({length: 10}, (_, i) => {
    const angle = start + turn * i / 9;
    const x = (vertex[0] + 17 * Math.cos(angle)).toFixed(3);
    const y = (vertex[1] + 17 * Math.sin(angle)).toFixed(3);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');
  return {kind: 'path', d, fill: 'none'};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const [a, b, c, d] = rng.shuffle([
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J',
    'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T',
  ]).slice(0, 4);
  const reflected = rng.chance(0.5);
  const transform = ([x, y]: Point): Point => [reflected ? 320 - x : x, y];
  const A = transform([43, 50]);
  const B = transform([58, 177]);
  const C = transform([248, 40.2]);
  const D = transform([284.5, 165.5]);
  const O = transform([158, 105]);
  const atA = `∠O${a}${b}`;
  const atB = `∠O${b}${a}`;
  const atC = `∠O${c}${d}`;
  const atD = `∠O${d}${c}`;
  const upper = `∠${a}O${c}`;
  const left = `${atA} + ${atB}`;
  const right = `${atC} + ${atD}`;
  const answer = `${left} = ${right}`;
  const claimedTotal = rng.pick([160, 170, 190, 200, 210]);
  const extra = rng.pick([10, 15, 20, 25]);
  const context = [
    `Triangles ${a}O${b} and ${c}O${d} meet at O.`,
    `${a}, O and ${d} are on one straight line in that order. ${b}, O and ${c} are on another straight line in that order.`,
    `The five marked angles, ${atA}, ${atB}, ${atC}, ${atD} and ${upper}, all have different sizes. The drawing is not to scale.`,
  ];
  const steps = [
    `∠${a}O${b} and ∠${c}O${d} are vertically opposite angles, so they are equal.`,
    `The angles in triangle ${a}O${b} total 180°, so ${left} = 180° − ∠${a}O${b}.`,
    `The angles in triangle ${c}O${d} total 180°, so ${right} = 180° − ∠${c}O${d}.`,
    `Subtracting equal angles from 180° gives equal totals. Therefore, ${answer}. No individual angle needs to be measured.`,
  ];
  const marks: Batch11UpperMark[] = [
    line(A, O), line(O, D), line(B, O), line(O, C), line(A, B), line(C, D),
    arc(A, O, B), arc(B, O, A), arc(C, O, D), arc(D, O, C), arc(O, A, C),
    text(transform([29, 43]), a), text(transform([43, 193]), b),
    text(transform([253, 31]), c), text(transform([289, 184]), d),
    text(transform([149, 128]), 'O'),
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'Which statement must be true?',
    context,
    choices: rng.shuffle([
      answer,
      `${left} + ${upper} = ${claimedTotal}°`,
      `${atA} + ${atC} = ${atB} + ${atD}`,
      `${left} = ${right} + ${extra}°`,
    ]),
    answer,
    hint: 'Compare the two angles at O inside the triangles. Then use the angle total of each triangle.',
    workedSteps: steps.map(value => ({text: value})),
    explanation: steps.join(' '),
    picture: {type: 'batch11-upper', label: context.join(' '), marks},
  };
}
