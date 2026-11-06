import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p6-rhombus-diagonal-half-angle-arithmetic',
  level: 6,
  title: 'Angles split by a rhombus diagonal',
  objective: 'Use equal angles beside a rhombus diagonal, then follow straight lines and parallel sides to find missing angles.',
  skillIds: ['P6.S.SHAPE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.02'],
  canonicalPatternId: 'p6-rhombus-diagonal-half-angle-arithmetic',
};

type Point = [number, number];
type Arc = {at: string; from: string; to: string; target?: string};
const rad = Math.PI / 180;

function diagram(
  raw: Record<string, Point>,
  edges: [string, string][],
  arcs: Arc[],
  offsets: Record<string, Point>,
  label: string,
): Batch11UpperPicture {
  const values = Object.values(raw);
  const minX = Math.min(...values.map(p => p[0]));
  const maxX = Math.max(...values.map(p => p[0]));
  const minY = Math.min(...values.map(p => p[1]));
  const maxY = Math.max(...values.map(p => p[1]));
  const scale = Math.min(250 / (maxX - minX), 132 / (maxY - minY));
  const left = (320 - (maxX - minX) * scale) / 2;
  const points: Record<string, Point> = {};
  for (const [name, [x, y]] of Object.entries(raw)) {
    points[name] = [left + (x - minX) * scale, 34 + (y - minY) * scale];
  }
  const marks: Batch11UpperMark[] = edges.map(([a, b]) => ({
    kind: 'line', x1: points[a][0], y1: points[a][1], x2: points[b][0], y2: points[b][1],
  }));
  for (const arc of arcs) {
    const vertex = points[arc.at], a = points[arc.from], b = points[arc.to];
    const start = Math.atan2(a[1] - vertex[1], a[0] - vertex[0]);
    let sweep = Math.atan2(b[1] - vertex[1], b[0] - vertex[0]) - start;
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;
    const radius = arc.target ? 20 : 13;
    const polar = (angle: number, r: number): Point => [vertex[0] + r * Math.cos(angle), vertex[1] + r * Math.sin(angle)];
    const u = polar(start, radius), v = polar(start + sweep, radius);
    marks.push({kind: 'path', d: `M ${u[0]} ${u[1]} A ${radius} ${radius} 0 0 ${sweep > 0 ? 1 : 0} ${v[0]} ${v[1]}`});
    if (arc.target) {
      const mid = polar(start + sweep / 2, 29);
      marks.push({kind: 'text', x: mid[0] - 4, y: mid[1] + 5, text: arc.target});
    }
  }
  for (const [name, point] of Object.entries(points)) {
    const offset = offsets[name] ?? [-5, -9];
    marks.push({kind: 'text', x: point[0] + offset[0], y: point[1] + offset[1], text: name});
  }
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 2;
  const finish = (
    context: string[], prompt: string, answers: number[], labels: string[],
    picture: Batch11UpperPicture, hint: string, workedSteps: NonNullable<Question['workedSteps']>,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, picture, hint, workedSteps,
    answer: JSON.stringify(answers.map(String)),
    structuredResponse: {kind: 'number-fields', fields: labels.map(label => ({label}))},
    unit: '°',
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    const half = r.pick([22, 24, 26, 28, 30]);
    const slope = r.pick([22, 24, 28, 30, 32]);
    const lower = r.pick([68, 72, 76, 80]);
    const vertex = 2 * half;
    const first = 180 - vertex - slope;
    const second = 180 - slope - lower;
    const context = [
      'ABGF is a rhombus. The neighbouring shape BCDG is a parallelogram.',
      'BDEF is a trapezium whose parallel sides are BD and FE.',
      'B is between A and C on a straight line. G is between F and D on a straight line.',
      'The segments FB and BD are already drawn.',
      `∠AFB = ${half}°. ∠CBD = ${slope}°. ∠GDE = ${lower}°.`,
      'Use the given angles. Do not measure the drawing.',
    ];
    const prompt = '(a) Find ∠DBG, marked p. (b) Find ∠DEF, marked q. Enter both angles in degrees.';
    // Construct the rhombus first, then intersect the rays that define D and E.
    const u = Math.cos(vertex * rad), v = Math.sin(vertex * rad);
    const dx = 1 + u + v / Math.tan(slope * rad);
    const t = dx / (Math.cos(slope * rad) + Math.sin(slope * rad) / Math.tan(lower * rad));
    const picture = diagram(
      {A: [u, -v], B: [1 + u, -v], G: [1, 0], F: [0, 0], C: [dx + u, -v], D: [dx, 0], E: [t * Math.cos(slope * rad), t * Math.sin(slope * rad)]},
      [['A', 'B'], ['B', 'G'], ['G', 'F'], ['F', 'A'], ['B', 'C'], ['C', 'D'], ['D', 'G'], ['F', 'B'], ['B', 'D'], ['D', 'E'], ['E', 'F']],
      [{at: 'F', from: 'A', to: 'B'}, {at: 'B', from: 'C', to: 'D'}, {at: 'D', from: 'G', to: 'E'}, {at: 'B', from: 'D', to: 'G', target: 'p'}, {at: 'E', from: 'D', to: 'F', target: 'q'}],
      {A: [-5, -9], B: [-5, -9], C: [5, -9], D: [7, 5], E: [-5, 20], F: [-18, 6], G: [-5, 20]},
      `${context.join(' ')} ${prompt}`,
    );
    return finish(context, prompt, [first, second], ['(a) ∠DBG (°)', '(b) ∠DEF (°)'], picture,
      'A rhombus diagonal splits a vertex angle into two equal angles. For (b), follow the parallel sides into triangle FDE.',
      [
        {text: 'FB bisects the angle at F, so its two parts are equal.', equation: `∠BFG = ∠AFB = ${half}°`},
        {text: 'Add the two parts. Opposite angles of a rhombus are equal.', equation: `∠ABG = ∠AFG = ${half}° + ${half}° = ${vertex}°`},
        {text: 'The three neighbouring angles below the straight line ABC add to 180°.', equation: `(a) p = 180° − ${vertex}° − ${slope}° = ${first}°`},
        {text: 'BC is parallel to FD, and BD is parallel to FE. These pairs give equal angles.', equation: `∠DFE = ∠CBD = ${slope}°`},
        {text: 'DG and DF are the same ray from D. Complete the angle sum of triangle FDE.', equation: `(b) q = 180° − ${slope}° − ${lower}° = ${second}°`},
      ]);
  }

  const atB = r.pick([66, 70, 78, 82]);
  const offset = r.pick([12, 14, 16]);
  const atC = r.pick([24, 26, 30, 32]);
  const half = (180 - atB) / 2;
  const first = half - offset;
  const cornerC = 180 - first;
  const combined = half + atC;
  const second = cornerC - combined;
  const context = [
    'The joined shapes are rhombus ABCG and parallelogram ACDE.',
    'F is where AE crosses GC. F is between A and E, and also between G and C.',
    'The segments AC and CE are already drawn.',
    `∠ABC = ${atB}°. ∠GAF = ${offset}°. ∠FCE = ${atC}°.`,
    'Use the given angles. Do not measure the drawing.',
  ];
  const prompt = '(a) Find ∠FAC, marked p. (b) Find ∠ECD, marked q. Enter both angles in degrees.';
  const u = Math.cos(atB * rad), v = Math.sin(atB * rad);
  const direction = (180 - atB - offset) * rad;
  const t = ((1 - u) * Math.sin(atC * rad) + v * Math.cos(atC * rad)) / Math.sin(direction + atC * rad);
  const ex = u + t * Math.cos(direction), ey = -v + t * Math.sin(direction);
  const picture = diagram(
    {A: [u, -v], B: [1 + u, -v], C: [1, 0], G: [0, 0], F: [u + v / Math.tan(direction), 0], E: [ex, ey], D: [1 + ex - u, ey + v]},
    [['A', 'B'], ['B', 'C'], ['C', 'G'], ['G', 'A'], ['A', 'C'], ['A', 'E'], ['E', 'D'], ['D', 'C'], ['C', 'E']],
    [{at: 'B', from: 'A', to: 'C'}, {at: 'A', from: 'G', to: 'F'}, {at: 'C', from: 'F', to: 'E'}, {at: 'A', from: 'F', to: 'C', target: 'p'}, {at: 'C', from: 'E', to: 'D', target: 'q'}],
    {A: [-5, -9], B: [4, -9], C: [8, -2], G: [-19, 4], F: [8, 17], E: [-18, 8], D: [-4, 20]},
    `${context.join(' ')} ${prompt}`,
  );
  return finish(context, prompt, [first, second], ['(a) ∠FAC (°)', '(b) ∠ECD (°)'], picture,
    'Use the equal sides of triangle ACG to find the angles beside AC. Then use your first answer in the parallelogram.',
    [
      {text: 'Opposite angles of the rhombus are equal.', equation: `∠AGC = ∠ABC = ${atB}°`},
      {text: 'AG = GC, so triangle ACG has two equal base angles beside diagonal AC.', equation: `∠GAC = ∠ACG = (180° − ${atB}°) ÷ 2 = ${half}°`},
      {text: 'AF lies inside angle GAC. Remove the small angle next to AG.', equation: `(a) p = ${half}° − ${offset}° = ${first}°`},
      {text: 'AF lies along AE, so angle EAC equals p. Adjacent angles of parallelogram ACDE add to 180°.', equation: `∠ACD = 180° − ${first}° = ${cornerC}°`},
      {text: 'CF lies along CG. Add the two parts of angle ACE.', equation: `∠ACE = ${half}° + ${atC}° = ${combined}°`},
      {text: 'Remove angle ACE from the whole angle ACD.', equation: `(b) q = ${cornerC}° − ${combined}° = ${second}°`},
    ]);
}
