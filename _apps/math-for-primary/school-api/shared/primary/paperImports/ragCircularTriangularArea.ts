import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p6-rag-circular-triangular-area',
  level: 6,
  title: 'Find shaded areas using circles and triangles',
  objective: 'Use equal lengths, circle parts and triangle areas to find shaded regions, accounting for overlaps.',
  skillIds: ['P6.S.CIRCLE.03'],
  canonicalPatternId: 'p6-circular-triangular-area-decomposition',
};

const SHADE = '#d7e8de';
const fmt = (n: number): string => String(Number(n.toFixed(2)));
const path = (d: string, fill?: string): Batch11UpperMark => ({kind: 'path', d, fill});
const text = (x: number, y: number, value: string): Batch11UpperMark => ({kind: 'text', x, y, text: value});
const line = (x1: number, y1: number, x2: number, y2: number): Batch11UpperMark => ({kind: 'line', x1, y1, x2, y2});
const circle = (cx: number, cy: number, r: number, fill?: string): Batch11UpperMark => ({kind: 'circle', cx, cy, r, fill});
const picture = (label: string, marks: Batch11UpperMark[]): Batch11UpperPicture => ({type: 'batch11-upper', label, marks});

function midpointPicture(side: number): Batch11UpperPicture {
  return picture(`Square WXYZ has side ${side} cm. Its circle touches all four sides. P and Q are the top and bottom midpoints. Triangle PZY and the two upper corner gaps are white. Every other part of the square is shaded, including the lower corner wedges.`, [
    path('M 80 100 A 80 80 0 0 1 240 100 L 240 180 L 80 180 Z', SHADE),
    path('M 160 20 L 80 180 L 240 180 Z', 'white'),
    circle(160, 100, 80),
    path('M 80 20 L 240 20 L 240 180 L 80 180 Z'),
    path('M 160 20 L 80 180 L 240 180 Z'),
    line(160, 20, 160, 180),
    text(60, 25, 'W'), text(247, 25, 'X'),
    text(60, 194, 'Z'), text(247, 194, 'Y'),
    text(154, 15, 'P'), text(154, 194, 'Q'),
    text(5, 105, `${side} cm`),
  ]);
}

function squareCirclesPicture(radius: number): Batch11UpperPicture {
  const r = Math.sqrt(5000);
  return picture(`Equal circles have centres A and C and intersect at B and D. ABCD is a square with AB ${radius} cm. The overlap is white and the parts belonging to just one circle are shaded.`, [
    circle(110, 100, r, SHADE), circle(210, 100, r, SHADE),
    path(`M 160 50 A ${r} ${r} 0 0 1 160 150 A ${r} ${r} 0 0 1 160 50 Z`, 'white'),
    path('M 110 100 L 160 50 L 210 100 L 160 150 Z'),
    path('M 116 94 L 122 100 L 116 106'),
    path('M 204 94 L 198 100 L 204 106'),
    text(90, 106, 'A'), text(216, 106, 'C'),
    text(154, 40, 'B'), text(154, 170, 'D'),
    text(114, 194, `AB = ${radius} cm`),
  ]);
}

function diameterPicture(radius: number): Batch11UpperPicture {
  const r = Math.sqrt(5000);
  const triangle = 'M 160 30 L 60 130 L 260 130 Z';
  return picture(`Two equal circles each have radius ${radius} cm. AC and AB are their diameters and meet at a right angle at A. The overlap and the circle parts outside triangle ABC are shaded. The rest of the triangle is white.`, [
    circle(110, 80, r, SHADE), circle(210, 80, r, SHADE),
    path(triangle, 'white'),
    path(`M 160 30 A ${r} ${r} 0 0 1 160 130 A ${r} ${r} 0 0 1 160 30 Z`, SHADE),
    circle(110, 80, r), circle(210, 80, r),
    path(triangle),
    path('M 154 36 L 160 42 L 166 36'),
    text(154, 22, 'A'), text(42, 147, 'C'), text(267, 147, 'B'),
    text(86, 185, `Each radius: ${radius} cm`),
  ]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const rng = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`circle-triangle:${seed}`) >>> 0) + Math.trunc(index) % 3 + 3) % 3;
  const make = (context: string[], prompt: string, answer: string, hint: string, steps: string[], diagram: Batch11UpperPicture, extra: Partial<Question> = {}): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint,
    workedSteps: steps.map(value => ({text: value})),
    explanation: steps.join(' '),
    picture: diagram,
    ...extra,
  });

  if (variant === 0) {
    const side = rng.pick([12, 16, 20, 24, 28, 32, 36, 44]);
    const radius = side / 2;
    const squareArea = side * side;
    const circleArea = 3.14 * radius * radius;
    const topGaps = (squareArea - circleArea) / 2;
    const triangleArea = side * side / 2;
    const shaded = squareArea - topGaps - triangleArea;
    return make([
      `Square WXYZ has side length ${side} cm. A circle fits exactly inside it and touches all four sides.`,
      'P and Q are the midpoints of WX and ZY, so WP = PX and ZQ = QY.',
      'Triangle PZY and the two corner gaps above the circle are white. Every other part of the square is shaded. Use π = 3.14.',
    ], 'What is the total shaded area?', fmt(shaded),
    'Find the white triangle and the two white corner gaps, then subtract them from the square.', [
      `The circle's diameter equals the square side. Its radius is ${side} ÷ 2 = ${radius} cm.`,
      `Square area = ${side} × ${side} = ${squareArea} cm². Circle area = 3.14 × ${radius} × ${radius} = ${fmt(circleArea)} cm².`,
      `The four gaps between the square and circle are equal. The two upper gaps have area (${squareArea} − ${fmt(circleArea)}) ÷ 2 = ${fmt(topGaps)} cm².`,
      `Triangle PZY has base ZY = ${side} cm and perpendicular height PQ = ${side} cm. Its area is 1/2 × ${side} × ${side} = ${triangleArea} cm².`,
      `Shaded area = ${squareArea} − ${fmt(topGaps)} − ${triangleArea} = ${fmt(shaded)} cm². The lower corner wedges are included.`,
    ], midpointPicture(side), {unit: 'cm²'});
  }

  if (variant === 1) {
    const radius = rng.pick([8, 10, 12, 16, 18, 20, 24]);
    const circleArea = 3.14 * radius * radius;
    const twoQuadrants = circleArea / 2;
    const squareArea = radius * radius;
    const overlap = twoQuadrants - squareArea;
    const perimeter = 3.14 * radius;
    const shaded = 2 * circleArea - 2 * overlap;
    return make([
      'Two equal circles have centres A and C. They meet at B and D.',
      `ABCD is a square with AB = ${radius} cm.`,
      'The part common to both circles is white. All the other parts inside the circles are shaded. Use π = 3.14.',
    ], 'Find (a) the perimeter of the white overlap and (b) the total shaded area.',
    JSON.stringify([fmt(perimeter), fmt(shaded)]),
    'Each curved edge of the overlap is a quarter-circle. For the area, use the square to find the overlap first.', [
      `AB is a radius, so each radius is ${radius} cm. The angles at A and C in the square are right angles.`,
      `(a) The white boundary has two quarter-circle arcs and no straight edges. Perimeter = 2 × 1/4 × 2 × 3.14 × ${radius} = ${fmt(perimeter)} cm.`,
      `(b) The two quarter-circles inside the square have total area 2 × 1/4 × 3.14 × ${radius} × ${radius} = ${fmt(twoQuadrants)} cm².`,
      `Together they cover the square and count the overlap twice. Overlap area = ${fmt(twoQuadrants)} − ${radius} × ${radius} = ${fmt(overlap)} cm².`,
      `Adding both full circles counts the white overlap twice. Remove it twice: shaded area = 2 × ${fmt(circleArea)} − 2 × ${fmt(overlap)} = ${fmt(shaded)} cm².`,
    ], squareCirclesPicture(radius), {
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Perimeter (cm)',
        secondLabel: '(b) Shaded area (cm²)',
        decimal: true,
      },
    });
  }

  const radius = rng.pick([7, 21, 28, 35]);
  const diameter = radius * 2;
  const circleArea = 22 * radius * radius / 7;
  const triangleArea = diameter * diameter / 2;
  const shaded = 2 * circleArea - triangleArea;
  return make([
    `Two equal circles each have radius ${radius} cm. AB and AC are diameters, and angle BAC is 90°.`,
    'Inside triangle ABC, only the overlap is shaded. The rest of the triangle is white. The parts of either circle outside the triangle are shaded. Use π = 22/7.',
  ], 'Find the total area of all the shaded parts.', fmt(shaded),
  'Add the two circle areas. Think about how many times the shaded overlap is counted before subtracting the triangle.', [
    `The equal diameters are AB = AC = 2 × ${radius} = ${diameter} cm.`,
    `AB and AC are perpendicular, so the triangle area is 1/2 × ${diameter} × ${diameter} = ${triangleArea} cm².`,
    `One circle has area 22/7 × ${radius} × ${radius} = ${fmt(circleArea)} cm². Adding both circle areas gives ${fmt(2 * circleArea)} cm².`,
    'That sum counts the overlap twice. The whole triangle is inside the two circles. Subtracting the triangle removes the white parts and one copy of the overlap, leaving the shaded overlap counted once.',
    `Total shaded area = ${fmt(2 * circleArea)} − ${triangleArea} = ${fmt(shaded)} cm².`,
  ], diameterPicture(radius), {unit: 'cm²'});
}
