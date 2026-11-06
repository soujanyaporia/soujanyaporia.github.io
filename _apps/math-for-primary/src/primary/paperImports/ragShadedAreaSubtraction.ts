import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-shaded-area-subtraction',
  level: 5,
  title: 'Find shaded and unshaded areas',
  objective: 'Use component areas and triangle areas to find the area of selected regions.',
  skillIds: ['P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'shaded-area-by-subtracting-known-regions',
} as const;

type Point = [number, number];
type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Steps = NonNullable<Question['workedSteps']>;

function drawing(width: number, height: number, label: string) {
  const picture: Diagram = {type: 'batch11-upper', label, marks: []};
  const scale = Math.min(220 / width, 125 / height);
  const project = ([x, y]: Point): Point => [(320 - width * scale) / 2 + x * scale, 30 + y * scale];
  function polygon(points: Point[], shaded = false) {
    picture.marks.push({
      kind: 'path',
      d: points.map((p, i) => `${i === 0 ? 'M' : 'L'}${project(p).join(' ')}`).join(' ') + ' Z',
      fill: shaded ? '#badbd0' : 'none',
    });
  }
  function line(a: Point, b: Point, dashed = false) {
    const [x1, y1] = project(a), [x2, y2] = project(b);
    picture.marks.push({kind: 'line', x1, y1, x2, y2, dashed});
  }
  function tick(a: Point, b: Point) {
    const [ax, ay] = project(a), [bx, by] = project(b);
    const length = Math.hypot(bx - ax, by - ay);
    const dx = -(by - ay) * 4 / length, dy = (bx - ax) * 4 / length;
    const x = (ax + bx) / 2, y = (ay + by) / 2;
    picture.marks.push({kind: 'line', x1: x - dx, y1: y - dy, x2: x + dx, y2: y + dy});
  }
  function letter(point: Point, text: string, dx = -5, dy = -7) {
    const [x, y] = project(point);
    picture.marks.push({kind: 'text', x: x + dx, y: y + dy, text});
  }
  return {picture, polygon, line, tick, letter};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (hashString(String(seed)) % 3 + ((Math.trunc(index) % 3) + 3) % 3) % 3;
  const finish = (prompt: string, answer: number, picture: Diagram, context: string[], hint: string, workedSteps: Steps): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, context, picture, answer: String(answer), unit: 'cm²', hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    const u = r.pick([6, 8, 10]);
    const side = 3 * u, an = 2 * r.int(u / 2 + 1, u + 1), cd = r.pick([u - 2, u + 2, u + 4]);
    const rectangleWidth = cd + u, rectangleHeight = 2 * u;
    const whole = side * side + rectangleWidth * rectangleHeight;
    const mn = side - an, hj = side - u;
    const leftCut = u * mn / 2, lowerCut = u * hj / 2, upperCut = u * u / 2;
    const removed = leftCut + lowerCut + upperCut;
    const p = {
      A: [0, u], B: [side, u], C: [side, 0], D: [side + cd, 0],
      E: [side + cd + u, 0], F: [side + cd + u, u], G: [side + cd + u, 2 * u],
      H: [side, 2 * u], J: [side, 4 * u], K: [2 * u, 4 * u],
      L: [u, 4 * u], M: [0, 4 * u], N: [0, u + an],
    } satisfies Record<string, Point>;
    const d = drawing(side + cd + u, 4 * u,
      'A square and rectangle meet along BH. Triangles MNL, HJK and DEF are white; the rest is shaded. Matching ticks show equal segments.');
    d.polygon([p.A, p.B, p.C, p.D, p.F, p.G, p.H, p.K, p.L, p.N], true);
    d.polygon([p.A, p.B, p.J, p.M]);
    d.polygon([p.C, p.E, p.G, p.H]);
    d.line(p.B, p.F, true);
    d.tick(p.D, p.E); d.tick(p.E, p.F); d.tick(p.F, p.G);
    d.tick(p.M, p.L); d.tick(p.L, p.K); d.tick(p.K, p.J);
    const labels: [keyof typeof p, number, number][] = [
      ['A', -20, 4], ['B', -18, -5], ['C', -18, -7], ['D', -5, -7],
      ['E', 7, -7], ['F', 7, 5], ['G', 7, 14], ['H', 5, 18],
      ['J', -5, 22], ['K', -5, 22], ['L', -5, 22], ['M', -21, 14], ['N', -21, 5],
    ];
    for (const [name, dx, dy] of labels) d.letter(p[name], name, dx, dy);
    return finish('How much of the joined shape is shaded?', whole - removed, d.picture, [
      'The shape on the left, ABJM, is a square. The shape on the right, CEGH, is a rectangle. They meet along BH.',
      `AB = ${side} cm, AN = ${an} cm and CD = ${cd} cm.`,
      'The six segments DE, EF, FG, ML, LK and KJ have the same length.',
      'A, B and F lie on one horizontal line. C, B, H and J lie on one vertical line. N is on AM, D is on CE, and M, L, K and J lie along the bottom of the square.',
      'The three white triangles MNL, HJK and DEF are left out. All the remaining parts of the square and rectangle are shaded.',
    ], 'Start with the three equal pieces along MJ. Use their length to work out the rectangle and the three white triangles.', [
      {text: 'Divide the square side into three equal lengths.', equation: `${side} ÷ 3 = ${u} cm`},
      {text: 'Find the width and height of the rectangle.', equation: `CE = ${cd} + ${u} = ${rectangleWidth} cm; EG = ${u} + ${u} = ${rectangleHeight} cm`},
      {text: 'Add the square and rectangle areas. Their interiors do not overlap.', equation: `${side} × ${side} + ${rectangleWidth} × ${rectangleHeight} = ${whole} cm²`},
      {text: 'B and F are level, and H and G are level, so BH = FG. Find the missing vertical lengths.', equation: `MN = ${side} − ${an} = ${mn} cm; HJ = ${side} − ${u} = ${hj} cm`},
      {text: 'Add the areas of white triangles MNL, HJK and DEF.', equation: `${u} × ${mn} ÷ 2 + ${u} × ${hj} ÷ 2 + ${u} × ${u} ÷ 2 = ${removed} cm²`},
      {text: 'Remove the white areas from the whole area.', equation: `${whole} − ${removed} = ${whole - removed} cm²`},
    ]);
  }

  if (variant === 1) {
    const height = r.pick([16, 20, 28, 32]), left = r.pick([6, 8, 12]);
    const right = r.pick([14, 16, 20, 22].filter(value => (left + value) * height !== 672));
    const width = left + right, total = width * height;
    const leftArea = left * height, leftShaded = leftArea / 4, rightShaded = right * height / 2;
    const p = {
      A: [0, 0], B: [left, 0], C: [width, 0], D: [width, height],
      E: [left, height], F: [0, height], O: [left / 2, height / 2],
    } satisfies Record<string, Point>;
    const d = drawing(width, height,
      'A large rectangle is split vertically at BE. The diagonals of the left rectangle cross at O. Triangles AFO and CDE are shaded.');
    d.polygon([p.A, p.F, p.O], true);
    d.polygon([p.C, p.D, p.E], true);
    d.polygon([p.A, p.C, p.D, p.F]);
    d.line(p.B, p.E); d.line(p.A, p.E); d.line(p.F, p.B); d.line(p.E, p.C);
    const labels: [keyof typeof p, number, number][] = [
      ['A', -18, -7], ['B', -5, -7], ['C', 6, -7], ['D', 6, 17],
      ['E', -5, 22], ['F', -18, 17], ['O', 7, 4],
    ];
    for (const [name, dx, dy] of labels) d.letter(p[name], name, dx, dy);
    return finish('Find the combined area of the two shaded triangles.', leftShaded + rightShaded, d.picture, [
      'A vertical line BE divides the large rectangle ACDF into a left rectangle ABEF and a right rectangle BCDE.',
      `The large rectangle covers ${total} cm². Its height CD is ${height} cm, and ED is ${right} cm.`,
      'The two corner-to-corner lines AE and BF cross at O. The coloured triangles are AFO and CDE.',
    ], 'Use the whole area to find the full width. The crossing lines divide the left rectangle into four triangles of equal area.', [
      {text: 'Divide the whole area by the common height to find the full width.', equation: `${total} ÷ ${height} = ${width} cm`},
      {text: 'Take away the right width to find the left width.', equation: `${width} − ${right} = ${left} cm`},
      {text: 'Find the area of the left rectangle.', equation: `${left} × ${height} = ${leftArea} cm²`},
      {text: 'The diagonals meet halfway across and halfway up the rectangle. Each of the four triangles has one quarter of its area.', equation: `${leftArea} ÷ 4 = ${leftShaded} cm²`},
      {text: 'Triangle CDE is half of the right rectangle.', equation: `${right} × ${height} ÷ 2 = ${rightShaded} cm²`},
      {text: 'Combine the two shaded areas.', equation: `${leftShaded} + ${rightShaded} = ${leftShaded + rightShaded} cm²`},
    ]);
  }

  const small = r.pick([8, 10, 12, 14]);
  const large = r.pick([small + 4, small + 6, small + 8].filter(value => value !== 16));
  const rectangleWidth = r.pick([2, 4, 6].filter(value => small * small > large * value));
  const width = rectangleWidth + small + large;
  const rectangleHeight = r.pick([4, 6, 10].filter(value => value < small && value * width > large * rectangleWidth));
  const base = rectangleWidth + small;
  const whole = rectangleWidth * rectangleHeight + small * small + large * large;
  const shaded = base * large / 2;
  const A: Point = [0, large], C: Point = [base, large], E: Point = [width, 0];
  const d = drawing(width, large,
    'A rectangle, a smaller square and a larger square stand next to one another on the same straight baseline. Triangle ACE is shaded across the three shapes.');
  d.polygon([A, C, E], true);
  d.polygon([[0, large - rectangleHeight], [rectangleWidth, large - rectangleHeight], [rectangleWidth, large], A]);
  d.polygon([[rectangleWidth, large - small], [base, large - small], C, [rectangleWidth, large]]);
  d.polygon([[base, 0], E, [width, large], C]);
  d.letter(A, 'A', -17, 20); d.letter(C, 'C', -5, 22); d.letter(E, 'E', 6, -7);
  return finish('What is the total area of the parts that are not shaded?', whole - shaded, d.picture, [
    'From left to right there are a rectangle, a smaller square and a larger square. They touch along vertical edges and share a straight bottom edge.',
    `The rectangle is ${rectangleWidth} cm wide and ${rectangleHeight} cm high.`,
    `The square sides are ${small} cm and ${large} cm, in that order.`,
    'A is the bottom left corner of the rectangle. C is the bottom left corner of the larger square, and E is its top right corner.',
    'Only triangle ACE is shaded.',
  ], 'Add the areas of the three shapes, then take away triangle ACE. Its base includes the rectangle width and the smaller square side.', [
    {text: 'Add the areas of the rectangle and both squares.', equation: `${rectangleWidth} × ${rectangleHeight} + ${small} × ${small} + ${large} × ${large} = ${whole} cm²`},
    {text: 'Find the full base AC of the shaded triangle.', equation: `${rectangleWidth} + ${small} = ${base} cm`},
    {text: 'The perpendicular height from E to AC is the larger square side.', equation: `${base} × ${large} ÷ 2 = ${shaded} cm²`},
    {text: 'Subtract the shaded triangle from the whole figure.', equation: `${whole} − ${shaded} = ${whole - shaded} cm²`},
  ]);
}
