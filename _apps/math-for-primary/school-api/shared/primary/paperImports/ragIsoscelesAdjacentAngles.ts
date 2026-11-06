import {Rng, hashString} from '../../engine/random';
import type {Question, Picture} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-isosceles-adjacent-angles',
  level: 5,
  title: 'Angles beside an isosceles triangle',
  objective: 'Use equal base angles, triangle angle sums and straight lines to find a missing angle.',
  skillIds: ['P5.S.ANGLE.01', 'P5.S.SHAPE.01', 'P5.S.SHAPE.03'],
  canonicalPatternId: 'p5-single-isosceles-triangle-with-adjacent-angles',
};

type Diagram = Extract<Picture, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = readonly [number, number];
type Edge = readonly [string, string];
type AngleMark = {from: string; vertex: string; to: string; label: string; radius: number};
const rad = (degrees: number) => degrees * Math.PI / 180;
const line = (a: Point, b: Point): Mark => ({kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
const text = (p: Point, value: string): Mark => ({kind: 'text', x: p[0], y: p[1], text: value});

// Original vector diagrams. Trigonometry is used only to place the drawing;
// the pupil's solution uses primary-school angle facts.
function diagram(
  world: Record<string, Point>,
  edges: readonly Edge[],
  offsets: Record<string, Point>,
  equalSides: readonly Edge[],
  angles: readonly AngleMark[],
  label: string,
): Diagram {
  const values = Object.values(world);
  const minX = Math.min(...values.map(p => p[0]));
  const maxX = Math.max(...values.map(p => p[0]));
  const minY = Math.min(...values.map(p => p[1]));
  const maxY = Math.max(...values.map(p => p[1]));
  const scale = Math.min(240 / (maxX - minX), 134 / (maxY - minY));
  const left = (320 - (maxX - minX) * scale) / 2;
  const points: Record<string, Point> = {};
  for (const [name, p] of Object.entries(world)) {
    points[name] = [left + (p[0] - minX) * scale, 24 + (maxY - p[1]) * scale];
  }
  const marks: Mark[] = edges.map(([a, b]) => line(points[a], points[b]));
  for (const [a, b] of equalSides) {
    const u = points[a], v = points[b];
    const length = Math.hypot(v[0] - u[0], v[1] - u[1]);
    const dx = -(v[1] - u[1]) * 4 / length;
    const dy = (v[0] - u[0]) * 4 / length;
    const x = (u[0] + v[0]) / 2, y = (u[1] + v[1]) / 2;
    marks.push(line([x - dx, y - dy], [x + dx, y + dy]));
  }
  for (const angle of angles) {
    const o = points[angle.vertex], a = points[angle.from], b = points[angle.to];
    const start = Math.atan2(a[1] - o[1], a[0] - o[0]);
    const end = Math.atan2(b[1] - o[1], b[0] - o[0]);
    const turn = ((end - start + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const polar = (t: number, radius: number): Point => [o[0] + radius * Math.cos(t), o[1] + radius * Math.sin(t)];
    const u = polar(start, angle.radius), v = polar(start + turn, angle.radius);
    marks.push({kind: 'path', d: `M ${u[0]} ${u[1]} A ${angle.radius} ${angle.radius} 0 0 ${turn > 0 ? 1 : 0} ${v[0]} ${v[1]}`});
    const at = polar(start + turn / 2, angle.radius + 14);
    marks.push(text([at[0] - angle.label.length * 4, at[1] + 5], angle.label));
  }
  for (const [name, p] of Object.entries(points)) {
    const offset = offsets[name];
    marks.push(text([p[0] + offset[0], p[1] + offset[1]], name));
  }
  return {type: 'batch11-upper', label, marks};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`adjacent:${seed}`) >>> 0) + (index >>> 0)) % 2;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    const a = r.pick([72, 76, 80, 84, 88, 92]);
    const b = r.pick([30, 34, 42, 46]);
    const corner = 180 - a - b;
    const apex = 180 - corner;
    const base = (180 - apex) / 2;
    const answer = 180 - base;
    const context = [
      'A, C and D lie on a straight line, with C between A and D.',
      'B, E and C lie on another straight line, with E between B and C. CE = CD.',
      `Angle BAC is ${a}°; angle ABC is ${b}°. The sketch is not drawn to scale.`,
    ];
    const prompt = 'How large is angle BED? Give your answer in degrees.';
    const steps = [
      `The angles in triangle ABC add to 180°. Angle ACB = 180° − ${a}° − ${b}° = ${corner}°.`,
      `A, C and D are on a straight line. Angle ECD = 180° − ${corner}° = ${apex}°.`,
      'CE = CD, so the base angles CED and EDC are equal.',
      `Angle CED = (180° − ${apex}°) ÷ 2 = ${base}°.`,
      `B, E and C are on a straight line. Angle BED = 180° − ${base}° = ${answer}°.`,
    ];
    const ab = Math.sin(rad(corner)) / Math.sin(rad(a));
    const world: Record<string, Point> = {
      A: [ab * Math.cos(rad(b)), ab * Math.sin(rad(b))],
      B: [0, 0], C: [1, 0], E: [0.55, 0],
      D: [1 + 0.45 * Math.cos(rad(corner)), -0.45 * Math.sin(rad(corner))],
    };
    return {
      key, prompt, context, answer: String(answer), unit: 'degrees',
      hint: 'Start with triangle ABC. Then use the straight lines and the equal sides of triangle CED.',
      workedSteps: steps.map(text => ({text})), explanation: steps.join(' '),
      picture: diagram(
        world,
        [['A', 'B'], ['A', 'C'], ['C', 'D'], ['B', 'E'], ['E', 'C'], ['E', 'D']],
        {A: [-4, -12], B: [-14, 9], C: [9, -6], D: [8, 8], E: [-3, -10]},
        [['C', 'E'], ['C', 'D']],
        [
          {from: 'B', vertex: 'A', to: 'C', label: `${a}°`, radius: 18},
          {from: 'A', vertex: 'B', to: 'C', label: `${b}°`, radius: 25},
          {from: 'B', vertex: 'E', to: 'D', label: '?', radius: 16},
        ],
        `${context.join(' ')} ${prompt}`,
      ),
    };
  }

  const u = r.pick([36, 40, 44, 48, 52, 56]);
  const v = r.pick([64, 68, 72, 76, 80, 84]);
  const apex = 180 - u - v;
  const answer = (180 - apex) / 2;
  const context = [
    'Triangle KLM has KM = LM.',
    'K, M and N lie on a straight line, with M between K and N. Ray MP splits angle LMN into two smaller angles.',
    `Angle LMP is ${u}°; angle PMN is ${v}°. The sketch is not drawn to scale.`,
  ];
  const prompt = 'Which value is angle KLM, in degrees?';
  const steps = [
    `The three adjacent angles at M make a straight angle. Angle KML = 180° − ${u}° − ${v}° = ${apex}°.`,
    'KM = LM, so the base angles MKL and KLM are equal.',
    `The two base angles total 180° − ${apex}° = ${180 - apex}°.`,
    `Angle KLM = ${180 - apex}° ÷ 2 = ${answer}°.`,
  ];
  const choices = r.shuffle([...new Set([answer, apex, u + v, apex / 2, u, v, 180 - answer])].slice(0, 4).map(String));
  return {
    key, prompt, context, answer: String(answer), choices, unit: 'degrees',
    hint: 'Find the angle inside the triangle at M. Then share the remaining angle total equally.',
    workedSteps: steps.map(text => ({text})), explanation: steps.join(' '),
    picture: diagram(
      {
        K: [-1, 0], M: [0, 0], N: [0.85, 0],
        L: [Math.cos(rad(u + v)), Math.sin(rad(u + v))],
        P: [0.95 * Math.cos(rad(v)), 0.95 * Math.sin(rad(v))],
      },
      [['K', 'L'], ['L', 'M'], ['K', 'M'], ['M', 'N'], ['M', 'P']],
      {K: [-14, 12], L: [-6, -12], M: [-3, 20], N: [9, 10], P: [-3, -11]},
      [['K', 'M'], ['L', 'M']],
      [
        {from: 'L', vertex: 'M', to: 'P', label: `${u}°`, radius: 40},
        {from: 'P', vertex: 'M', to: 'N', label: `${v}°`, radius: 23},
        {from: 'K', vertex: 'L', to: 'M', label: '?', radius: 16},
      ],
      `${context.join(' ')} ${prompt}`,
    ),
  };
}
