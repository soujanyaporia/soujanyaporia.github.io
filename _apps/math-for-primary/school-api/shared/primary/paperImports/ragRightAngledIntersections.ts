import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperPicture, Batch11UpperMark} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p6-rag-right-angled-intersections',
  level: 6,
  title: 'Angles inside a rectangle',
  objective: 'Use rectangle corners, straight lines and triangle angles to find unknown angles without adding lines.',
  skillIds: ['P6.S.SHAPE.01', 'P5.S.SHAPE.01'],
  canonicalPatternId: 'p6-right-angled-figure-intersecting-segments',
};

type Point = [number, number];
type Points = Record<string, Point>;
type Step = NonNullable<Question['workedSteps']>[number];
const radians = (degrees: number) => degrees * Math.PI / 180;
const tan = (degrees: number) => Math.tan(radians(degrees));
const coord = (n: number) => Number(n.toFixed(3));

function arc(points: Points, name: string, radius: number): Batch11UpperMark {
  const [a, v, b] = name.split('').map(letter => points[letter]);
  const start = Math.atan2(a[1] - v[1], a[0] - v[0]);
  const end = Math.atan2(b[1] - v[1], b[0] - v[0]);
  let turn = end - start;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn < -Math.PI) turn += 2 * Math.PI;
  const x1 = coord(v[0] + radius * Math.cos(start));
  const y1 = coord(v[1] + radius * Math.sin(start));
  const x2 = coord(v[0] + radius * Math.cos(start + turn));
  const y2 = coord(v[1] + radius * Math.sin(start + turn));
  return {kind: 'path', d: `M ${x1} ${y1} A ${radius} ${radius} 0 0 ${turn > 0 ? 1 : 0} ${x2} ${y2}`};
}

function corner(points: Points, name: string): Batch11UpperMark {
  const [a, v, b] = name.split('').map(letter => points[letter]);
  const along = (p: Point): Point => {
    const length = Math.hypot(p[0] - v[0], p[1] - v[1]);
    return [7 * (p[0] - v[0]) / length, 7 * (p[1] - v[1]) / length];
  };
  const u = along(a), w = along(b);
  return {kind: 'path', d: `M ${v[0] + u[0]} ${v[1] + u[1]} L ${v[0] + u[0] + w[0]} ${v[1] + u[1] + w[1]} L ${v[0] + w[0]} ${v[1] + w[1]}`};
}

function diagram(points: Points, edges: string[], corners: string[], arcs: [string, number][], offsets: Points, label: string): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = edges.map(edge => {
    const [a, b] = edge.split('').map(letter => points[letter]);
    return {kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]};
  });
  for (const name of corners) marks.push(corner(points, name));
  for (const [name, radius] of arcs) marks.push(arc(points, name, radius));
  for (const [name, point] of Object.entries(points)) {
    const offset = offsets[name];
    marks.push({kind: 'text', x: point[0] + offset[0], y: point[1] + offset[1], text: name});
  }
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`rectangle-layout:${seed}`) + Math.trunc(index)) % 3 + 3) % 3;
  const finish = (prompt: string, context: string[], answer: string | number, picture: Batch11UpperPicture, steps: Step[], extra: Partial<Question> = {}): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    context,
    answer: String(answer),
    unit: '°',
    picture,
    hint: 'Each corner of a rectangle is 90°. Look for a triangle and angles on a straight line.',
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const a = r.pick([54, 56, 60, 62, 64]);
    const rise = r.pick([44, 46, 48, 50]);
    const b = 180 - rise;
    const h = 112, w = h * tan(a), x = (320 - w) / 2, y = 32;
    const e = w - h / tan(rise);
    const t = w / (2 * w - e);
    const points: Points = {
      A: [x, y], B: [x, y + h], C: [x + w, y + h], D: [x + w, y],
      E: [x + e, y + h], F: [x + w * t, y + h * t],
    };
    const prompt = 'Find ∠AFD.';
    const context = [
      'ABCD is a rectangle. E is between B and C.',
      'Segments AC and DE cross at F. A, F, C are on one straight line, and D, F, E are on another.',
      `∠BAC = ${a}° and ∠BED = ${b}°.`,
      'Use the angle facts, not measurements from the drawing.',
    ];
    const picture = diagram(points, ['AB', 'BE', 'EC', 'CD', 'DA', 'AF', 'FC', 'DF', 'FE'], ['ABC', 'BCD'], [['BAC', 24], ['BED', 20], ['AFD', 18]], {
      A: [-14, -8], B: [-16, 19], C: [6, 19], D: [7, -8], E: [-5, 22], F: [8, 17],
    }, `${context.join(' ')} ${prompt}`);
    const atC = 90 - a, atE = 180 - b, answer = 180 - atC - atE;
    return finish(prompt, context, answer, picture, [
      {text: 'Triangle ABC has a right angle at B. CF follows CA, so this also gives ∠ECF.', equation: `∠ECF = 180° − 90° − ${a}° = ${atC}°`},
      {text: 'B, E and C are on a straight line, and EF follows ED.', equation: `∠FEC = 180° − ${b}° = ${atE}°`},
      {text: 'The angles of triangle EFC add to 180°.', equation: `∠EFC = 180° − ${atC}° − ${atE}° = ${answer}°`},
      {text: '∠AFD and ∠EFC are vertically opposite angles, so they are equal.', equation: `∠AFD = ${answer}°`},
    ]);
  }

  if (variant === 1) {
    const c = r.pick([26, 30, 34, 36]);
    const answer = r.pick([15, 19, 23, 27]);
    const meeting = c + answer;
    const h = 130, w = h * (tan(c) + tan(answer)), x = (320 - w) / 2, y = 25;
    const points: Points = {
      A: [x, y + h], B: [x, y], C: [x + w, y], D: [x + w, y + h],
      E: [x + h * tan(answer), y + h],
    };
    const prompt = 'Find ∠ABE.';
    const context = [
      'ABCD is a rectangle. E lies between A and D, and is joined to B and C.',
      `∠DCE = ${c}° and ∠BEC = ${meeting}°.`,
      'Use the angle facts, not measurements from the drawing.',
    ];
    const picture = diagram(points, ['AB', 'BC', 'CD', 'DE', 'EA', 'BE', 'CE'], ['BAD', 'ADC'], [['DCE', 26], ['BEC', 20], ['ABE', 32]], {
      A: [-17, 20], B: [-12, -9], C: [5, -9], D: [6, 20], E: [-5, 23],
    }, `${context.join(' ')} ${prompt}`);
    const atC = 90 - c, atB = 180 - meeting - atC;
    return finish(prompt, context, answer, picture, [
      {text: 'CE splits the right angle at C.', equation: `∠BCE = 90° − ${c}° = ${atC}°`},
      {text: 'Use the angle sum of triangle BEC.', equation: `∠EBC = 180° − ${meeting}° − ${atC}° = ${atB}°`},
      {text: 'BE splits the right angle at B.', equation: `∠ABE = 90° − ${atB}° = ${answer}°`},
    ]);
  }

  const a = r.pick([24, 26, 28]);
  const c = r.pick([40, 42, 44]);
  const f = r.pick([110, 114, 118]);
  const h = 104, w = h / tan(a), x = (320 - w) / 2, y = 30;
  const e = w - h * tan(c), foot = e - h / tan(180 - f);
  const points: Points = {
    A: [x, y], B: [x + w, y], C: [x + w, y + h], D: [x, y + h],
    E: [x + e, y], F: [x + foot, y + h],
  };
  const prompt = 'Find (a) ∠ECA and (b) ∠FEC.';
  const context = [
    'In rectangle ABCD, E is between A and B, and F is between D and C.',
    'Segments AC, EC and EF are drawn. Use the same diagram for both parts.',
    `∠DFE = ${f}°, ∠EAC = ${a}° and ∠BCE = ${c}°.`,
    'Use the angle facts, not measurements from the drawing.',
  ];
  const picture = diagram(points, ['AE', 'EB', 'BC', 'CF', 'FD', 'DA', 'AC', 'EF', 'EC'], ['ABC', 'ADC'], [['EAC', 26], ['BCE', 22], ['DFE', 18], ['ECA', 38], ['FEC', 19]], {
    A: [-16, -8], B: [6, -8], C: [7, 19], D: [-16, 19], E: [-5, -11], F: [-5, 23],
  }, `${context.join(' ')} ${prompt}`);
  const bca = 90 - a, first = bca - c, ecf = 90 - c, efc = 180 - f, second = 180 - ecf - efc;
  return finish(prompt, context, JSON.stringify([String(first), String(second)]), picture, [
    {text: '(a) E lies on AB, so ∠BAC equals the given ∠EAC. Triangle ABC has a right angle at B.', equation: `∠BCA = 180° − 90° − ${a}° = ${bca}°`},
    {text: 'Remove ∠BCE from ∠BCA.', equation: `∠ECA = ${bca}° − ${c}° = ${first}°`},
    {text: '(b) CE splits the right angle at C, and CF lies along CD.', equation: `∠ECF = 90° − ${c}° = ${ecf}°`},
    {text: 'D, F and C lie on a straight line.', equation: `∠EFC = 180° − ${f}° = ${efc}°`},
    {text: 'Use the three angles of triangle EFC.', equation: `∠FEC = 180° − ${ecf}° − ${efc}° = ${second}°`},
  ], {
    structuredResponse: {kind: 'number-pair', firstLabel: '(a) ∠ECA (°)', secondLabel: '(b) ∠FEC (°)'},
  });
}
