import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-rectangle-right-angle-arithmetic',
  level: 5,
  title: 'Find angles using a rectangle',
  objective: 'Combine rectangle corners, straight lines and triangle angle sums to find a marked angle.',
  skillIds: ['P4.S.SHAPE.01', 'P5.S.ANGLE.01', 'P5.S.ANGLE.04', 'P5.S.SHAPE.01'],
  canonicalPatternId: 'rectangle-and-square-right-angle-arithmetic',
};

type Point = [number, number];
const rad = Math.PI / 180;
const line = (a: Point, b: Point): Batch11UpperMark =>
  ({kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
const text = (p: Point, value: string, dx = 0, dy = 0): Batch11UpperMark =>
  ({kind: 'text', x: p[0] + dx, y: p[1] + dy, text: value});

function sector(v: Point, a: Point, b: Point, radius: number, label?: string, labelRadius = radius + 20): Batch11UpperMark[] {
  const start = Math.atan2(a[1] - v[1], a[0] - v[0]);
  let sweep = Math.atan2(b[1] - v[1], b[0] - v[0]) - start;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep < -Math.PI) sweep += 2 * Math.PI;
  const at = (angle: number, r: number): Point =>
    [v[0] + r * Math.cos(angle), v[1] + r * Math.sin(angle)];
  const first = at(start, radius), last = at(start + sweep, radius);
  const marks: Batch11UpperMark[] = [{
    kind: 'path',
    d: `M ${first[0]} ${first[1]} A ${radius} ${radius} 0 0 ${sweep > 0 ? 1 : 0} ${last[0]} ${last[1]}`,
  }];
  if (label) marks.push(text(at(start + sweep / 2, labelRadius), label, -label.length * 4, 5));
  return marks;
}

function rightMark(v: Point): Batch11UpperMark {
  return {kind: 'path', d: `M ${v[0] + 9} ${v[1]} V ${v[1] + 9} H ${v[0]}`};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 2;
  const finish = (context: string[], prompt: string, answer: number, marks: Batch11UpperMark[], hint: string, workedSteps: NonNullable<Question['workedSteps']>): Question => {
    const picture: Batch11UpperPicture = {
      type: 'batch11-upper',
      label: `${context.join(' ')} ${prompt}`,
      marks,
    };
    return {
      key, context, prompt, picture, answer: String(answer), unit: 'degrees', hint, workedSteps,
      explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    };
  };

  if (variant === 0) {
    const given = r.pick([112, 116, 121, 124, 128]);
    const theta = given - 90;
    const height = 135 * Math.tan(theta * rad);
    const P: Point = [45, 64], Q: Point = [45, 64 + height];
    const R: Point = [180, 64 + height], S: Point = [180, 64];
    const T: Point = [180 + 74 * Math.cos(theta * rad), 64 - 74 * Math.sin(theta * rad)];
    const inner = 180 - given;
    const upper = 90 - inner;
    const answer = 180 - upper;
    const context = [
      'PQRS is a rectangle.',
      'The line from Q through S continues to T. Q, S and T lie on one straight line, in that order.',
      `The marked angle RST is ${given}°.`,
      'Use the given angle sizes. Do not measure the drawing.',
    ];
    const marks: Batch11UpperMark[] = [
      line(P, Q), line(Q, R), line(R, S), line(S, P), line(Q, T), rightMark(P),
      ...sector(S, T, R, 30, `${given}°`, 57),
      ...sector(S, P, T, 27, 'x', 46),
      text(P, 'P', -19, 5), text(Q, 'Q', -19, 8),
      text(R, 'R', 5, 17), text(S, 'S', 7, 20), text(T, 'T', 7, 2),
    ];
    return finish(context, 'Angle x is ∠PST. How many degrees is angle x?', answer, marks,
      'Start with the straight line at S. Then use the right angle inside the rectangle.', [
        {text: 'SQ and ST point in opposite directions along a straight line.', equation: `∠QSR = 180° − ${given}° = ${inner}°`},
        {text: 'QS splits the right angle PSR into two parts.', equation: `∠PSQ = 90° − ${inner}° = ${upper}°`},
        {text: 'Use the straight line QST again to find the marked angle.', equation: `x = 180° − ${upper}° = ${answer}°`},
      ]);
  }

  const atG = r.pick([24, 28, 32, 36]);
  const target = r.pick([32, 36, 40, 44]);
  const atF = 90 - atG;
  const crossing = 180 - atG - target;
  const A: Point = [100, 30], B: Point = [290, 30];
  const C: Point = [290, 120], D: Point = [100, 120], E: Point = [25, 30];
  const G: Point = [225, 30];
  const F: Point = [25, 30 + 200 * Math.tan(atG * rad)];
  const H: Point = [100 + 90 / Math.tan(target * rad), 120];
  const jx = (G[0] * Math.tan(atG * rad) + A[0] * Math.tan(target * rad))
    / (Math.tan(atG * rad) + Math.tan(target * rad));
  const J: Point = [jx, 30 + (jx - 100) * Math.tan(target * rad)];
  const context = [
    'ABCD is a rectangle. E, A, G and B lie on one straight line, in that order.',
    'F is below E, and EF is perpendicular to EB. H lies between D and C.',
    'The segments FG and AH cross at J.',
    `∠EFG = ${atF}° and ∠AJG = ${crossing}°.`,
    'Use the given angle sizes. Do not measure the drawing.',
  ];
  const marks: Batch11UpperMark[] = [
    line(A, B), line(B, C), line(C, D), line(D, A),
    line(E, A), line(E, F), line(F, G), line(A, H), rightMark(E),
    ...sector(F, E, G, 19, `${atF}°`, 39),
    ...sector(J, A, G, 12, `${crossing}°`, 24),
    ...sector(A, G, H, 16),
    text(A, 'A', -7, -10), text(B, 'B', -5, -10), text(C, 'C', -5, 21),
    text(D, 'D', -14, 21), text(E, 'E', -7, -10), text(F, 'F', -17, 14),
    text(G, 'G', -5, -10), text(H, 'H', -5, 21), text(J, 'J', -4, 29),
  ];
  return finish(context, 'Work out ∠GAH.', target, marks,
    'Find the angle at G in the right-angled triangle EFG. Then look at triangle AJG.', [
      {text: 'EF is perpendicular to EB, so angle FEG is a right angle.', equation: '∠FEG = 90°'},
      {text: 'The angles in triangle EFG add to 180°.', equation: `∠EGF = 180° − 90° − ${atF}° = ${atG}°`},
      {text: 'GA lies along GE, and GJ lies along GF, so this is also the angle at G in triangle AJG.', equation: `∠AGJ = ${atG}°`},
      {text: 'AJ lies along AH. Complete the angle sum in triangle AJG.', equation: `∠GAH = 180° − ${crossing}° − ${atG}° = ${target}°`},
    ]);
}
