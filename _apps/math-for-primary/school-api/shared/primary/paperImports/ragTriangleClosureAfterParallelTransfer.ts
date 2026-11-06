import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-triangle-closure-after-parallel-transfer',
  level: 6,
  title: 'Follow angles into a triangle',
  objective: 'Use parallel sides and straight lines to find angles, then complete a triangle.',
  skillIds: ['P6.S.SHAPE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02'],
  canonicalPatternId: 'triangle-closure-after-parallel-transfer',
};

type Point = [number, number];
type Arc = {at: string; from: string; to: string; target?: boolean};
const radians = Math.PI / 180;
const cot = (degrees: number) => 1 / Math.tan(degrees * radians);

function diagram(
  raw: Record<string, Point>,
  edges: [string, string][],
  arcs: Arc[],
  offsets: Record<string, Point>,
  label: string,
): Batch11UpperPicture {
  const points = Object.values(raw);
  const minX = Math.min(...points.map(p => p[0]));
  const maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1]));
  const maxY = Math.max(...points.map(p => p[1]));
  const scale = Math.min(258 / (maxX - minX), 116 / (maxY - minY));
  const left = (320 - (maxX - minX) * scale) / 2;
  const p: Record<string, Point> = {};
  for (const [name, [x, y]] of Object.entries(raw)) {
    p[name] = [left + (x - minX) * scale, 38 + (y - minY) * scale];
  }
  const marks: Batch11UpperMark[] = edges.map(([a, b]) => ({
    kind: 'line', x1: p[a][0], y1: p[a][1], x2: p[b][0], y2: p[b][1],
  }));
  for (const arc of arcs) {
    const v = p[arc.at], a = p[arc.from], b = p[arc.to];
    const start = Math.atan2(a[1] - v[1], a[0] - v[0]);
    let sweep = Math.atan2(b[1] - v[1], b[0] - v[0]) - start;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const radius = arc.target ? 19 : 13;
    const point = (t: number): Point => [v[0] + radius * Math.cos(t), v[1] + radius * Math.sin(t)];
    const u = point(start), w = point(start + sweep);
    const f = (n: number) => n.toFixed(3);
    marks.push({kind: 'path', d: `M ${f(u[0])} ${f(u[1])} A ${radius} ${radius} 0 0 ${sweep > 0 ? 1 : 0} ${f(w[0])} ${f(w[1])}`});
    if (arc.target) {
      const mid = start + sweep / 2;
      marks.push({kind: 'text', x: v[0] + 29 * Math.cos(mid) - 4, y: v[1] + 29 * Math.sin(mid) + 5, text: '?'});
    }
  }
  for (const [name, [x, y]] of Object.entries(p)) {
    const [dx, dy] = offsets[name] ?? [-5, -9];
    marks.push({kind: 'text', x: x + dx, y: y + dy, text: name});
  }
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const finish = (q: Omit<Question, 'key' | 'explanation'>): Question => ({
    ...q,
    key,
    explanation: (q.workedSteps ?? []).map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    const f = r.pick([104, 108, 112, 116, 120]);
    const g = r.pick([28, 32, 36, 40, 44].filter(n => f + n >= 136 && f + n <= 156));
    const c = r.pick([56, 60, 66, 70]);
    const small = 180 - f - g;
    const answer = 180 - small - c;
    const s = -cot(f), d = cot(small), b = 0.44 * (d - s);
    const context = [
      'ABEF is a parallelogram.',
      'Along the top straight line, the points are A, B, C in that order. Along the bottom straight line, they are F, E, D in that order.',
      'AD and BE meet at G.',
      `∠AFE = ${f}°. ∠AGB = ${g}°. ∠ACD = ${c}°.`,
      'Use the given angles, rather than measuring the drawing.',
    ];
    const prompt = 'What is the size of ∠ADC?';
    const picture = diagram(
      {A: [0, 0], B: [b, 0], C: [d + cot(c), 0], D: [d, 1], E: [b + s, 1], F: [s, 1], G: [0.44 * d, 0.44]},
      [['A', 'B'], ['B', 'E'], ['E', 'F'], ['F', 'A'], ['B', 'C'], ['E', 'D'], ['C', 'D'], ['A', 'D']],
      [{at: 'F', from: 'A', to: 'E'}, {at: 'G', from: 'A', to: 'B'}, {at: 'C', from: 'A', to: 'D'}, {at: 'D', from: 'A', to: 'C', target: true}],
      {A: [-14, -8], B: [-5, -9], C: [5, -7], D: [5, 18], E: [-5, 19], F: [-15, 17], G: [7, 5]},
      `${context.join(' ')} ${prompt}`,
    );
    return finish({
      prompt, context, picture, answer: String(answer), unit: '°',
      hint: 'AF and BE are parallel. First find the angles in triangle AFD.',
      workedSteps: [
        {text: 'AD crosses the parallel sides AF and BE. The matching alternate angles are equal.', equation: `∠FAD = ∠AGB = ${g}°`},
        {text: 'FD runs along FE. The three angles in triangle AFD add to 180°.', equation: `∠ADF = 180° − ${f}° − ${g}° = ${small}°`},
        {text: 'AC and FD are parallel, so AD makes equal alternate angles with them.', equation: `∠CAD = ∠ADF = ${small}°`},
        {text: 'Complete the angle sum in triangle ACD.', equation: `∠ADC = 180° − ${small}° − ${c}° = ${answer}°`},
      ],
    });
  }

  if (variant === 1) {
    const j = r.pick([100, 104, 108, 116, 120]);
    const m = r.pick([26, 30, 34, 38, 42].filter(n => j - n >= 60 && j - n <= 86));
    const atL = 180 - j;
    const answer = 180 - atL - m;
    const s = -cot(j);
    const context = [
      'JKLM is a parallelogram.',
      'The bottom side continues past L to N. K, L and N are on one straight line, with L between K and N.',
      `∠KJM = ${j}°. ∠LMN = ${m}°.`,
      'Use the given angles, rather than measuring the drawing.',
    ];
    const prompt = 'Work out ∠MNL.';
    const picture = diagram(
      {J: [s, 0], K: [0, 1], L: [1, 1], M: [1 + s, 0], N: [1 + s + cot(answer), 1]},
      [['J', 'K'], ['K', 'L'], ['L', 'M'], ['M', 'J'], ['L', 'N'], ['M', 'N']],
      [{at: 'J', from: 'K', to: 'M'}, {at: 'M', from: 'L', to: 'N'}, {at: 'N', from: 'M', to: 'L', target: true}],
      {J: [-7, -9], K: [-14, 18], L: [-5, 19], M: [-5, -9], N: [5, 18]},
      `${context.join(' ')} ${prompt}`,
    );
    return finish({
      prompt, context, picture, answer: String(answer), unit: '°',
      hint: 'Find the opposite angle at L, then use the straight line through K, L and N.',
      workedSteps: [
        {text: 'Opposite angles in a parallelogram are equal.', equation: `∠KLM = ∠KJM = ${j}°`},
        {text: 'LK and LN point in opposite directions along a straight line.', equation: `∠MLN = 180° − ${j}° = ${atL}°`},
        {text: 'The three angles in triangle LMN add to 180°.', equation: `∠MNL = 180° − ${atL}° − ${m}° = ${answer}°`},
      ],
    });
  }

  // Correlated integer givens preserve the rhombus and every incidence.
  const interior = r.pick([96, 98, 100, 102, 106]);
  const alpha = 2 * interior - 180;
  const beta = interior / 2;
  const exterior = interior;
  const transfer = 180 - exterior;
  const second = 180 - transfer - beta;
  const u = Math.cos(interior * radians), v = Math.sin(interior * radians);
  const context = [
    'The four sides of rhombus ABCD are equal. Side DC is parallel to side EF of triangle EFG.',
    'D lies between E and G on straight line EG. C lies between F and G on straight line FG. G lies between A and B on side AB.',
    `∠ADG = ${alpha}°. ∠EDC = ${exterior}°. ∠DGC = ${beta}°.`,
    'Use the given angles, rather than measuring the drawing.',
  ];
  const prompt = '(a) Work out ∠ABC. (b) Work out ∠EFG. Give both answers in degrees.';
  const picture = diagram(
    {A: [u, -v], B: [1 + u, -v], C: [1, 0], D: [0, 0], G: [-u, -v], E: [0.3 * u, 0.3 * v], F: [1 + 0.3 * (1 + u), 0.3 * v]},
    [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A'], ['E', 'G'], ['G', 'F'], ['F', 'E']],
    [{at: 'D', from: 'A', to: 'G'}, {at: 'D', from: 'E', to: 'C'}, {at: 'G', from: 'D', to: 'C'}, {at: 'B', from: 'A', to: 'C', target: true}, {at: 'F', from: 'E', to: 'G', target: true}],
    {A: [-13, -9], B: [5, -7], C: [7, 6], D: [-17, -3], G: [-5, -10], E: [-14, 18], F: [5, 18]},
    `${context.join(' ')} ${prompt}`,
  );
  return finish({
    prompt, context, picture, unit: '°',
    answer: JSON.stringify([String(interior), String(second)]),
    structuredResponse: {kind: 'number-fields', fields: [{label: '(a) ∠ABC (°)'}, {label: '(b) ∠EFG (°)'}]},
    hint: 'Start with the straight line through E, D and G. Use the rhombus for (a), and the parallel sides for (b).',
    workedSteps: [
      {text: 'DE and DG are opposite rays on a straight line.', equation: `∠GDC = 180° − ${exterior}° = ${transfer}°`},
      {text: 'DG splits the angle at D into two parts. Opposite angles of a rhombus are equal.', equation: `(a) ∠ABC = ∠ADC = ${alpha}° + ${transfer}° = ${interior}°`},
      {text: 'DC is parallel to EF, and EG crosses both. The corresponding angles at D and E are equal.', equation: `∠GEF = ∠GDC = ${transfer}°`},
      {text: 'GD lies along GE and GC lies along GF, so the angle at G is the given angle. Complete triangle EFG.', equation: `(b) ∠EFG = 180° − ${transfer}° − ${beta}° = ${second}°`},
    ],
  });
}
