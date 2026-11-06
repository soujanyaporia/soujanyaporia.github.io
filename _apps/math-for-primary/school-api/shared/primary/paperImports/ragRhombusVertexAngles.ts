import {Rng, hashString} from '../../engine/random';
import type {Question, Picture} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-rhombus-vertex-angles',
  level: 5,
  title: 'Find angles in rhombuses',
  objective: 'Use rhombus properties, straight lines and equal-side triangles to find missing angles.',
  skillIds: ['P5.S.SHAPE.01', 'P5.S.SHAPE.02', 'P5.S.SHAPE.03', 'P5.S.ANGLE.01', 'P5.S.ANGLE.02', 'P5.S.ANGLE.04'],
  canonicalPatternId: 'p5-rhombus-vertex-angle-propagation',
};

type Point = {x: number; y: number};
type Diagram = Extract<Picture, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
const radians = (degrees: number) => degrees * Math.PI / 180;
const point = (x: number, y: number): Point => ({x, y});
const line = (a: Point, b: Point): Mark => ({kind: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y});
const text = (p: Point, value: string, dx = 0, dy = 0): Mark => ({kind: 'text', x: p.x + dx, y: p.y + dy, text: value});
const polar = (centre: Point, radius: number, degrees: number): Point => point(centre.x + radius * Math.cos(radians(degrees)), centre.y + radius * Math.sin(radians(degrees)));
const cycle = (vertices: Point[]): Mark[] => vertices.map((p, i) => line(p, vertices[(i + 1) % vertices.length]));
const figure = (label: string, marks: Mark[]): Diagram => ({type: 'batch11-upper', label, marks});

function arc(vertex: Point, a: Point, b: Point, radius: number): Mark {
  const start = Math.atan2(a.y - vertex.y, a.x - vertex.x);
  const end = Math.atan2(b.y - vertex.y, b.x - vertex.x);
  const turn = Math.atan2(Math.sin(end - start), Math.cos(end - start));
  const u = point(vertex.x + radius * Math.cos(start), vertex.y + radius * Math.sin(start));
  const v = point(vertex.x + radius * Math.cos(end), vertex.y + radius * Math.sin(end));
  return {kind: 'path', d: `M ${u.x} ${u.y} A ${radius} ${radius} 0 0 ${turn >= 0 ? 1 : 0} ${v.x} ${v.y}`};
}

function betweenRays(vertex: Point, a: Point, b: Point, radius: number): Point {
  const da = Math.hypot(a.x - vertex.x, a.y - vertex.y);
  const db = Math.hypot(b.x - vertex.x, b.y - vertex.y);
  const x = (a.x - vertex.x) / da + (b.x - vertex.x) / db;
  const y = (a.y - vertex.y) / da + (b.y - vertex.y) / db;
  const length = Math.hypot(x, y);
  return point(vertex.x + radius * x / length, vertex.y + radius * y / length);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) % 3 + index) % 3 + 3) % 3;
  const make = (context: string[], prompt: string, answer: string, hint: string, steps: string[], picture: Picture, extra: Partial<Question> = {}): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, picture,
    unit: 'degrees',
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
    ...extra,
  });

  if (variant === 0) {
    const a = r.pick([48, 52, 60, 64, 68, 72]);
    const rayAngle = r.pick([24, 28, 32, 36, 44]);
    const exterior = 180 - rayAngle;
    const vertexAngle = 180 - a;
    const first = 360 - vertexAngle - exterior;
    const equalBase = (180 - a) / 2;
    const abf = 180 - first;
    const second = abf - equalBase;
    // rayAngle < equalBase keeps F strictly between C and D.
    const side = 114;
    const B = point(100, 62);
    const C = point(B.x + side, B.y);
    const A = point(B.x - side * Math.cos(radians(a)), B.y + side * Math.sin(radians(a)));
    const D = point(A.x + side, A.y);
    const rayLength = side * Math.sin(radians(a)) / Math.sin(radians(a + rayAngle));
    const F = polar(B, rayLength, rayAngle);
    const E = polar(B, 42, rayAngle + 180);
    const picture = figure(
      `Rhombus ABCD with diagonal BD drawn. F is between C and D. E, B and F are on a straight line in that order. Angle BAD is ${a} degrees and angle EBC is ${exterior} degrees.`,
      [
        ...cycle([A, B, C, D]), line(B, D), line(E, F),
        arc(A, B, D, 17), arc(B, E, C, 21),
        text(A, 'A', -14, 12), text(B, 'B', -12, -6),
        text(C, 'C', 9, 4), text(D, 'D', 5, 15),
        text(E, 'E', -13, -6), text(F, 'F', 8, 4),
        text(polar(A, 31, -a / 2), `${a}°`, -10, 4),
        text(polar(B, 36, (rayAngle - 180) / 2), `${exterior}°`, -13, 4),
      ],
    );
    return make(
      [
        'ABCD is a rhombus. F is on side CD, between C and D.',
        'E, B and F lie on one straight line, with B between E and F. BD is drawn.',
        `Angle BAD is ${a}°. Angle EBC is ${exterior}°. The sketch is not drawn to scale.`,
      ],
      'Find (a) angle ABE and (b) angle DBF.',
      JSON.stringify([String(first), String(second)]),
      'Find the whole angle ABC first. For part (b), use the equal sides of triangle ABD and your answer to part (a).',
      [
        `Adjacent angles of a rhombus add to 180°. Angle ABC = 180° − ${a}° = ${vertexAngle}°.`,
        `The angles around B add to 360°. (a) Angle ABE = 360° − ${vertexAngle}° − ${exterior}° = ${first}°.`,
        `AB = AD, so triangle ABD has two equal base angles. Angle ABD = (180° − ${a}°) ÷ 2 = ${equalBase}°.`,
        `E, B and F form a straight line. Angle ABF = 180° − ${first}° = ${abf}°.`,
        `(b) Angle DBF = angle ABF − angle ABD = ${abf}° − ${equalBase}° = ${second}°.`,
      ],
      picture,
      {structuredResponse: {kind: 'number-pair', firstLabel: '(a) Angle ABE (degrees)', secondLabel: '(b) Angle DBF (degrees)'}},
    );
  }

  if (variant === 1) {
    const outer = r.pick([42, 46, 50, 54, 58]);
    const inner = r.pick([96, 100, 104, 112, 116, 120]);
    const outerBase = (180 - outer) / 2;
    const innerBase = (180 - inner) / 2;
    const answer = outerBase - innerBase;
    const halfHeight = 76;
    const halfWidth = halfHeight * Math.tan(radians(outer / 2));
    const innerHeight = halfWidth / Math.tan(radians(inner / 2));
    const A = point(210, 100 - halfHeight);
    const B = point(210 + halfWidth, 100);
    const C = point(210, 100 + halfHeight);
    const D = point(210 - halfWidth, 100);
    const E = point(210, 100 - innerHeight);
    const F = point(210, 100 + innerHeight);
    const picture = figure(
      `Rhombuses ABCD and EBFD share the drawn diagonal BD. E and F are inside ABCD. Angle DAB is ${outer} degrees and angle DEB is ${inner} degrees. Angle ADE is marked p.`,
      [
        ...cycle([A, B, C, D]), ...cycle([E, B, F, D]), line(B, D),
        arc(A, D, B, 12), arc(E, D, B, 11), arc(D, A, E, 20),
        text(point(10, 25), `∠DAB = ${outer}°`),
        text(point(10, 49), `∠DEB = ${inner}°`),
        text(A, 'A', -4, -10), text(B, 'B', 8, 5),
        text(C, 'C', -4, 16), text(D, 'D', -17, 5),
        text(E, 'E', 10, 3), text(F, 'F', 10, 8),
        text(betweenRays(D, A, E, 32), 'p', -4, 4),
      ],
    );
    return make(
      [
        'ABCD and EBFD are rhombuses. They share the drawn diagonal BD, and E and F are inside ABCD.',
        `Angle DAB is ${outer}°. Angle DEB is ${inner}°. The sketch is not drawn to scale.`,
      ],
      'Find angle ADE, marked p.',
      String(answer),
      'Use the equal sides to find the base angles in triangles ADB and EDB. Then subtract at D.',
      [
        `AD = AB, so triangle ADB is isosceles. Angle ADB = (180° − ${outer}°) ÷ 2 = ${outerBase}°.`,
        `ED = EB, so triangle EDB is isosceles. Angle EDB = (180° − ${inner}°) ÷ 2 = ${innerBase}°.`,
        `Angle ADE = angle ADB − angle EDB = ${outerBase}° − ${innerBase}° = ${answer}°.`,
      ],
      picture,
    );
  }

  const vertex = r.pick([96, 100, 104, 108, 112, 116]);
  const intersection = r.pick([98, 106, 110, 114, 118]);
  const base = (180 - vertex) / 2;
  const answer = 180 - base - intersection;
  const side = 130;
  const W = point(78, 42);
  const X = point(W.x + side, W.y);
  const shift = point(side * Math.cos(radians(vertex)), side * Math.sin(radians(vertex)));
  const Z = point(W.x + shift.x, W.y + shift.y);
  const Y = point(X.x + shift.x, X.y + shift.y);
  const diagonalLength = Math.hypot(Z.x - X.x, Z.y - X.y);
  const xo = side * Math.sin(radians(answer)) / Math.sin(radians(intersection));
  const O = point(X.x + (Z.x - X.x) * xo / diagonalLength, X.y + (Z.y - X.y) * xo / diagonalLength);
  const picture = figure(
    `Rhombus WXYZ with diagonal XZ drawn. O is strictly between X and Z, and OY is drawn. Angle XWZ is ${vertex} degrees and angle XOY is ${intersection} degrees. Find angle XYO.`,
    [
      ...cycle([W, X, Y, Z]), line(X, Z), line(O, Y),
      arc(W, X, Z, 15), arc(O, X, Y, 14), arc(Y, X, O, 14),
      text(point(10, 17), `∠XWZ = ${vertex}°`),
      text(point(170, 17), `∠XOY = ${intersection}°`),
      text(W, 'W', -15, -7), text(X, 'X', 8, -4),
      text(Y, 'Y', 8, 15), text(Z, 'Z', -14, 15),
      text(O, 'O', -13, -7),
      text(betweenRays(Y, X, O, 27), '?', -4, 4),
    ],
  );
  return make(
    [
      'WXYZ is a rhombus. O is on the drawn diagonal XZ, between X and Z. OY is also drawn.',
      `Angle XWZ is ${vertex}°. Angle XOY is ${intersection}°. The sketch is not drawn to scale.`,
    ],
    'Find angle XYO.',
    String(answer),
    'Find the opposite angle at Y. Then use the equal sides of triangle XYZ before looking at triangle XOY.',
    [
      `Opposite angles of a rhombus are equal, so angle XYZ = ${vertex}°.`,
      `XY = YZ, so triangle XYZ has two equal base angles. Angle YXZ = (180° − ${vertex}°) ÷ 2 = ${base}°.`,
      `O is on XZ, so angle YXO = ${base}°.`,
      `The angles in triangle XOY add to 180°. Angle XYO = 180° − ${base}° − ${intersection}° = ${answer}°.`,
    ],
    picture,
  );
}
