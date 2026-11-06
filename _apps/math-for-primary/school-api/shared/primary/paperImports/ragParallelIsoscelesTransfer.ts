import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-parallel-isosceles-transfer',
  level: 5,
  title: 'Follow angles through parallel sides',
  objective: 'Use parallel sides, equal base angles and angle sums to find angles in connected shapes.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03', 'P4.S.SHAPE.01'],
  canonicalPatternId: 'parallel-line-transfer-into-isosceles-triangle',
};

type Point = [number, number];
type Edge = [string, string];
type Corner = [string, string, string];
type Step = NonNullable<Question['workedSteps']>[number];
interface Drawing {
  nodes: Record<string, Point>;
  edges: Edge[];
  equal: Edge[];
  parallel: [string, string, number][];
  offsets: Record<string, Point>;
  right?: Corner[];
  reflex?: Corner;
}
const radians = (degrees: number) => degrees * Math.PI / 180;
const cot = (degrees: number) => 1 / Math.tan(radians(degrees));
const plus = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const times = (a: Point, k: number): Point => [a[0] * k, a[1] * k];
const difference = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const length = (a: Point) => Math.hypot(a[0], a[1]);
const unit = (a: Point): Point => times(a, 1 / length(a));
const line = (a: Point, b: Point): Batch11UpperMark => ({kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]});

/** Original vector geometry using the application's existing drawing model. */
function draw(spec: Drawing, label: string): Batch11UpperPicture {
  const raw = Object.values(spec.nodes);
  const minX = Math.min(...raw.map(p => p[0]));
  const maxX = Math.max(...raw.map(p => p[0]));
  const minY = Math.min(...raw.map(p => p[1]));
  const maxY = Math.max(...raw.map(p => p[1]));
  const scale = Math.min(252 / (maxX - minX), 122 / (maxY - minY));
  const points: Record<string, Point> = {};
  for (const [name, p] of Object.entries(spec.nodes)) {
    points[name] = [160 + (p[0] - (minX + maxX) / 2) * scale, 30 + (p[1] - minY) * scale];
  }
  const marks: Batch11UpperMark[] = spec.edges.map(([a, b]) => line(points[a], points[b]));
  for (const [a, b] of spec.equal) {
    const mid = times(plus(points[a], points[b]), 0.5);
    const direction = unit(difference(points[b], points[a]));
    const normal: Point = [-direction[1], direction[0]];
    marks.push(line(plus(mid, times(normal, -5)), plus(mid, times(normal, 5))));
  }
  for (const [a, b, fraction] of spec.parallel) {
    const direction = unit(difference(points[b], points[a]));
    const normal: Point = [-direction[1], direction[0]];
    const tip = plus(points[a], times(difference(points[b], points[a]), fraction));
    const back = plus(tip, times(direction, -6));
    marks.push(line(plus(back, times(normal, 4)), tip), line(plus(back, times(normal, -4)), tip));
  }
  for (const [a, v, b] of spec.right ?? []) {
    const p = plus(points[v], times(unit(difference(points[a], points[v])), 8));
    const q = plus(points[v], times(unit(difference(points[b], points[v])), 8));
    const corner = difference(plus(p, q), points[v]);
    marks.push({kind: 'path', d: `M ${p.join(' ')} L ${corner.join(' ')} L ${q.join(' ')}`});
  }
  if (spec.reflex) {
    const [a, v, b] = spec.reflex;
    const start = Math.atan2(points[a][1] - points[v][1], points[a][0] - points[v][0]);
    const end = Math.atan2(points[b][1] - points[v][1], points[b][0] - points[v][0]);
    const clockwise = (end - start + 2 * Math.PI) % (2 * Math.PI);
    const sweep = clockwise > Math.PI ? 1 : 0;
    const p = plus(points[v], [14 * Math.cos(start), 14 * Math.sin(start)]);
    const q = plus(points[v], [14 * Math.cos(end), 14 * Math.sin(end)]);
    marks.push({kind: 'path', d: `M ${p.join(' ')} A 14 14 0 1 ${sweep} ${q.join(' ')}`});
  }
  for (const [name, p] of Object.entries(points)) {
    const offset = spec.offsets[name] ?? [4, -8];
    marks.push({kind: 'circle', cx: p[0], cy: p[1], r: 1.5, fill: '#235b4c'});
    marks.push({kind: 'text', x: p[0] + offset[0], y: p[1] + offset[1], text: name});
  }
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const mod3 = (n: number) => ((Math.trunc(n) % 3) + 3) % 3;
  const variant = (mod3(seed) + mod3(index)) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const make = (context: string[], prompt: string, answer: string, hint: string, workedSteps: Step[], drawing: Drawing, extra: Partial<Question> = {}): Question => ({
    key, context, prompt, answer, hint, workedSteps, unit: 'degrees',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    picture: draw(drawing, `${context.join(' ')} ${prompt}`),
    ...extra,
  });

  if (variant === 0) {
    const s = r.pick([64, 66, 68, 72, 74, 76, 78]);
    const base = r.pick([42, 44, 46, 48, 50, 54, 56].filter(b => b <= s - 12 && 180 - s - b !== 58));
    const split = 180 - s - base;
    const adjacent = 180 - s;
    const answer = s - base;
    const shift = cot(s), width = 2 * cot(base);
    const wrong = [...new Set([base, split, s, 180 - 2 * base, answer + 6, answer + 12])]
      .filter(n => n !== answer && n > 0 && n < 180);
    const choices = r.shuffle([String(answer), ...r.shuffle(wrong).slice(0, 3).map(String)]);
    const context = [
      'Look at parallelogram PQRS. Point T is between S and R on side SR.',
      'The two sides PT and TQ have the same length, so triangle PQT is isosceles.',
      `Angle PSR = ${s}°. Angle SPT = ${split}°. Angle SRQ = ${adjacent}°.`,
      'Use the angle facts rather than measuring the drawing.',
    ];
    return make(context, 'How large is angle TQR?', String(answer),
      'Find the whole angle at P. Then use the equal base angles of triangle PQT.', [
        {text: 'Adjacent angles of a parallelogram add to 180°.', equation: `Angle SPQ = 180° − ${s}° = ${adjacent}°`},
        {text: 'PT splits the angle at P into two parts.', equation: `Angle QPT = ${adjacent}° − ${split}° = ${base}°`},
        {text: 'PT = TQ, so the base angles at P and Q are equal.', equation: `Angle PQT = ${base}°`},
        {text: 'Opposite angles of a parallelogram are equal.', equation: `Angle PQR = ${s}°`},
        {text: 'Subtract the triangle angle from the whole angle at Q.', equation: `Angle TQR = ${s}° − ${base}° = ${answer}°`},
      ], {
        nodes: {P: [shift, 0], Q: [shift + width, 0], R: [width, 1], S: [0, 1], T: [shift + width / 2, 1]},
        edges: [['P', 'Q'], ['Q', 'R'], ['R', 'S'], ['S', 'P'], ['P', 'T'], ['T', 'Q']],
        equal: [['P', 'T'], ['T', 'Q']],
        parallel: [['P', 'Q', 0.75], ['S', 'R', 0.2]],
        offsets: {P: [-14, -9], Q: [6, -8], R: [5, 22], S: [-16, 22], T: [-5, 22]},
      }, {choices});
  }

  if (variant === 1) {
    const a = r.pick([48, 52, 56, 64, 68]);
    const multiple = r.pick([2, 3]);
    const base = r.pick(multiple === 2 ? [54, 60, 66, 72, 78] : [56, 64, 72, 80]);
    const small = (180 - base) / (multiple + 1);
    const first = 180 - a - base;
    const second = multiple * small;
    const apex = 180 - 2 * base;
    const context = [
      'ABCD is a trapezium. Sides AB and DC are parallel, and E is between A and B on side AB.',
      'Triangle DEC has two equal sides: ED = EC.',
      `Angle DAB = ${a}°. Angle EDC = ${base}°.`,
      `Angle BCE is ${multiple} times angle CBE.`,
      'Use the angle facts rather than measuring the drawing.',
    ];
    return make(context, 'Work out (a) angle ADE and (b) angle BCE. Give both answers in degrees.',
      JSON.stringify([String(first), String(second)]),
      'For (a), use the parallel sides. For (b), use the equal base angles, then share the remaining triangle angles into equal parts.', [
        {text: '(a) The angles at A and D on side AD add to 180° because AB is parallel to DC.', equation: `Angle ADC = 180° − ${a}° = ${180 - a}°`},
        {text: 'Subtract the known part of the angle at D.', equation: `Angle ADE = ${180 - a}° − ${base}° = ${first}°`},
        {text: `(b) ED = EC, so both base angles of triangle DEC are ${base}°. Find its top angle.`, equation: `Angle DEC = 180° − 2 × ${base}° = ${apex}°`},
        {text: 'AB is parallel to DC, so alternate angles AED and EDC are equal.', equation: `Angle AED = ${base}°`},
        {text: 'A, E and B lie on a straight line.', equation: `Angle CEB = 180° − ${base}° − ${apex}° = ${base}°`},
        {text: `In triangle BCE, angle CBE is one part and angle BCE is ${multiple} parts. Remove angle CEB, then find one part.`, equation: `(180° − ${base}°) ÷ ${multiple + 1} = ${small}°`},
        {text: `Angle BCE contains ${multiple} of these equal parts.`, equation: `Angle BCE = ${multiple} × ${small}° = ${second}°`},
      ], {
        nodes: {A: [-cot(a), 0], B: [2 * cot(base) + cot(small), 0], C: [2 * cot(base), 1], D: [0, 1], E: [cot(base), 0]},
        edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['D', 'E'], ['E', 'C']],
        equal: [['D', 'E'], ['E', 'C']],
        parallel: [['A', 'B', 0.72], ['D', 'C', 0.5]],
        offsets: {A: [-16, -8], B: [6, -8], C: [5, 22], D: [-18, 22], E: [-5, -10]},
      }, {structuredResponse: {kind: 'number-pair', firstLabel: '(a) Angle ADE (°)', secondLabel: '(b) Angle BCE (°)'}});
  }

  const reflex = r.pick([232, 234, 236, 238, 240]);
  const f = r.pick([102, 106, 114, 118]);
  const theta = reflex - 180;
  const interior = 360 - reflex;
  const bcg = interior - 90;
  const first = 180 - f;
  const E: Point = [1 - 0.5 * Math.tan(radians(theta)), 0.5];
  const C: Point = [1, 1];
  const direction: Point = [Math.cos(radians(theta)), -Math.sin(radians(theta))];
  const reach = 0.5 / Math.sin(radians(theta)) + 0.24;
  const differenceInLengths = -length(difference(C, E)) * cot(f);
  const F = plus(E, times(direction, reach));
  const G = plus(C, times(direction, reach + differenceInLengths));
  const context = [
    'The figure combines square ABCD and trapezium EFGC. EF is parallel to CG.',
    'E is inside the square. BE = CE, so triangle BCE is isosceles.',
    `Angle CEF = 90°. Angle EFG = ${f}°.`,
    `Reflex angle DCG = ${reflex}°. This is the larger angle from CD to CG, shown by the arc outside the shapes.`,
    'Use the angle facts rather than measuring the drawing.',
  ];
  return make(context, 'Work out (a) angle FGC and (b) angle CBE. Give both answers in degrees.',
    JSON.stringify([String(first), String(theta)]),
    'Use the parallel sides for (a). For (b), first subtract the reflex angle from a full turn.', [
      {text: '(a) EF is parallel to CG, so the two angles on side FG add to 180°.', equation: `Angle FGC = 180° − ${f}° = ${first}°`},
      {text: '(b) Angles around C add to 360°. Find the smaller angle DCG.', equation: `Angle DCG = 360° − ${reflex}° = ${interior}°`},
      {text: 'The square gives a 90° angle DCB. Remove it from the smaller angle DCG.', equation: `Angle BCG = ${interior}° − 90° = ${bcg}°`},
      {text: 'CE is perpendicular to EF. Since EF is parallel to CG, CE is also perpendicular to CG.', equation: 'Angle ECG = 90°'},
      {text: 'BC splits angle ECG into two parts.', equation: `Angle BCE = 90° − ${bcg}° = ${theta}°`},
      {text: 'BE = CE, so the base angles at B and C are equal.', equation: `Angle CBE = ${theta}°`},
    ], {
      nodes: {A: [0, 0], B: [1, 0], C, D: [0, 1], E, F, G},
      edges: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['B', 'E'], ['E', 'C'], ['E', 'F'], ['F', 'G'], ['G', 'C']],
      equal: [['B', 'E'], ['C', 'E']],
      parallel: [['E', 'F', 0.5], ['C', 'G', 0.7]],
      right: [['A', 'D', 'C'], ['C', 'E', 'F']],
      reflex: ['D', 'C', 'G'],
      offsets: {A: [-16, -8], B: [5, -8], C: [-3, 34], D: [-18, 22], E: [-21, 6], F: [-9, -10], G: [5, -2]},
    }, {structuredResponse: {kind: 'number-pair', firstLabel: '(a) Angle FGC (°)', secondLabel: '(b) Angle CBE (°)'}});
}
