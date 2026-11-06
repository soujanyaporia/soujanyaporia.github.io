import type {Question} from '../generate';

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = {x: number; y: number};

export const RAG_PATTERN = {
  id: 'p5-triangle-adjacent-line-angle-chase',
  level: 5,
  title: 'Follow angles through triangles',
  objective: 'Use triangle angle sums with angles around a point, straight lines and vertically opposite angles.',
  skillIds: ['P5.S.SHAPE.01', 'P5.S.SHAPE.03', 'P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.ANGLE.03'],
  canonicalPatternId: 'triangle-and-adjacent-line-angle-chase',
} as const;

const radians = (degrees: number) => degrees * Math.PI / 180;
const point = (x: number, y: number): Point => ({x, y});
const ray = (origin: Point, length: number, angle: number): Point =>
  point(origin.x + length * Math.cos(angle), origin.y + length * Math.sin(angle));
const line = (a: Point, b: Point): Mark =>
  ({kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y});
const text = (at: Point, value: string): Mark =>
  ({kind: 'text', x: at.x - value.length * 4, y: at.y + 4, text: value});
const vertex = (at: Point, name: string, dx: number, dy: number): Mark =>
  text(point(at.x + dx, at.y + dy), name);
const coordinate = (p: Point) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
const diagram = (label: string, marks: Mark[]): Diagram =>
  ({type: 'batch11-upper', label, marks});

function angleMarks(a: Point, centre: Point, b: Point, label: string, radius = 18, labelRadius = 34): Mark[] {
  const start = Math.atan2(a.y - centre.y, a.x - centre.x);
  let turn = Math.atan2(b.y - centre.y, b.x - centre.x) - start;
  while (turn <= -Math.PI) turn += 2 * Math.PI;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  const from = ray(centre, radius, start);
  const to = ray(centre, radius, start + turn);
  return [
    {kind: 'path', d: `M ${coordinate(from)} A ${radius} ${radius} 0 0 ${turn > 0 ? 1 : 0} ${coordinate(to)}`, fill: 'none'},
    text(ray(centre, labelRadius, start + turn / 2), label),
  ];
}

function equalTick(a: Point, b: Point): Mark {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const middle = point((a.x + b.x) / 2, (a.y + b.y) / 2);
  const dx = -(b.y - a.y) / length * 5;
  const dy = (b.x - a.x) / length * 5;
  return line(point(middle.x - dx, middle.y - dy), point(middle.x + dx, middle.y + dy));
}

function random(seed: number, index: number): () => number {
  let state = 2166136261;
  for (const character of `${seed}:${index}`) {
    state = Math.imul(state ^ character.charCodeAt(0), 16777619) >>> 0;
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const next = random(seed, index);
  const pick = <T,>(values: readonly T[]): T => values[Math.floor(next() * values.length)];
  const shuffle = (values: number[]): string[] => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result.map(String);
  };
  const make = (
    context: string[], prompt: string, answer: number, hint: string,
    steps: string[], picture: Diagram, choices?: string[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer: String(answer), unit: 'degrees', hint,
    explanation: steps.join(' '), workedSteps: steps.map(text => ({text})), picture,
    ...(choices ? {choices} : {}),
  });
  const variant = ((seed % 3 + index % 3) % 3 + 3) % 3;

  if (variant === 0) {
    const reflex = pick([314, 318, 322, 326, 334, 338]);
    const inside = 360 - reflex;
    const answer = 180 - inside;
    const half = radians(inside / 2);
    const C = point(70, 105);
    const A = point(235, C.y - 165 * Math.tan(half));
    const B = point(250, C.y + 180 * Math.tan(half));
    const arcStart = ray(C, 24, -half);
    const arcEnd = ray(C, 24, half);
    const context = [
      'In triangle ABC, a is angle CAB and b is angle ABC.',
      `The reflex angle ACB is ${reflex}°. This is the larger angle outside the triangle.`,
      'Use the marked angles, not measurements from the drawing.',
    ];
    return make(
      context, 'Which value is a + b, in degrees?', answer,
      'Find the inside angle at C using one full turn. Then use the triangle angle sum.',
      [
        `Angles around C total 360°. The inside angle ACB is 360° − ${reflex}° = ${inside}°.`,
        `The inside angles of a triangle total 180°, so a + b = 180° − ${inside}° = ${answer}°.`,
      ],
      diagram(context.join(' '), [
        line(C, A), line(A, B), line(B, C),
        {kind: 'path', d: `M ${coordinate(arcStart)} A 24 24 0 1 0 ${coordinate(arcEnd)}`, fill: 'none'},
        text(point(24, 104), `${reflex}°`),
        ...angleMarks(C, A, B, 'a', 18, 32),
        ...angleMarks(A, B, C, 'b', 18, 32),
        vertex(A, 'A', 10, -10), vertex(B, 'B', 12, 10), vertex(C, 'C', 0, 34),
      ]),
      shuffle([answer, inside, answer / 2, 180 - inside / 2]),
    );
  }

  if (variant === 1) {
    const atB = pick([44, 47, 50, 53]);
    const atC = pick([31, 34, 37, 40]);
    const piece = pick([41, 46, 51, 56, 61]);
    // These ranges keep both triangles non-degenerate and D strictly inside BC.
    const atADC = 180 - atC - piece;
    const atADB = 180 - atADC;
    const answer = 180 - atB - atADB;
    const B = point(40, 174);
    const C = point(280, 174);
    const run = 240 * Math.tan(radians(atC)) / (Math.tan(radians(atB)) + Math.tan(radians(atC)));
    const A = point(B.x + run, B.y - run * Math.tan(radians(atB)));
    const D = point(A.x + (B.y - A.y) / Math.tan(radians(atC + piece)), B.y);
    const context = [
      'D lies between B and C on side BC of triangle ABC. Segment AD joins A to D.',
      `Angle ABC = ${atB}°. Angle ACB = ${atC}°. Angle DAC = ${piece}°.`,
      'The angle marked x is angle BAD. Use the given angles rather than measuring.',
    ];
    return make(
      context, 'Find angle BAD (x), in degrees.', answer,
      'Begin with triangle ADC. Then use the straight line through B, D and C.',
      [
        `In triangle ADC, angle ADC = 180° − ${atC}° − ${piece}° = ${atADC}°.`,
        `B, D and C lie on a straight line, so angle ADB = 180° − ${atADC}° = ${atADB}°.`,
        `In triangle ABD, angle BAD = 180° − ${atB}° − ${atADB}° = ${answer}°.`,
      ],
      diagram(context.join(' '), [
        line(A, B), line(B, C), line(C, A), line(A, D),
        ...angleMarks(A, B, C, `${atB}°`, 18, 38),
        ...angleMarks(A, C, B, `${atC}°`, 18, 38),
        ...angleMarks(D, A, C, `${piece}°`, 21, 42),
        ...angleMarks(B, A, D, 'x', 21, 36),
        vertex(A, 'A', 0, -14), vertex(B, 'B', -12, 14),
        vertex(C, 'C', 12, 14), vertex(D, 'D', 0, 17),
      ]),
    );
  }

  const base = pick([55, 59, 63, 67, 71]);
  const other = pick([41, 45, 49, 53, 57, 61]);
  const answer = 180 - base - other;
  const O = point(144, 102);
  const half = radians(base / 2);
  const A = ray(O, 90, Math.PI + half);
  const B = ray(O, 180 * Math.cos(radians(base)), Math.PI - half);
  const C = ray(O, 110, -half);
  const D = ray(O, 110 * Math.sin(radians(other)) / Math.sin(radians(answer)), half);
  const context = [
    'A, O and D lie on one straight line, in that order. B, O and C lie on another straight line, in that order.',
    `AB = AO. Angle ABO = ${base}°. Angle OCD = ${other}°.`,
    'The angle marked x is angle ODC. The matching ticks show the equal sides. Use the given angles rather than measuring.',
  ];
  return make(
    context, 'Find angle ODC (x), in degrees.', answer,
    'Use the equal sides to find angle AOB, then look across the intersection.',
    [
      `In triangle ABO, AB = AO, so the opposite angles AOB and ABO are equal. Angle AOB = ${base}°.`,
      `Angle COD is vertically opposite angle AOB, so angle COD = ${base}°.`,
      `In triangle COD, angle ODC = 180° − ${base}° − ${other}° = ${answer}°.`,
    ],
    diagram(context.join(' '), [
      line(A, O), line(O, D), line(B, O), line(O, C), line(A, B), line(C, D),
      equalTick(A, B), equalTick(A, O),
      ...angleMarks(A, B, O, `${base}°`, 13, 27),
      ...angleMarks(O, C, D, `${other}°`, 16, 31),
      ...angleMarks(O, D, C, 'x', 16, 29),
      vertex(A, 'A', -11, -10), vertex(B, 'B', -14, 14),
      vertex(C, 'C', 12, -10), vertex(D, 'D', 12, 14), vertex(O, 'O', 0, -12),
    ]),
    shuffle([answer, 180 - 2 * base, 180 - base, other]),
  );
}
