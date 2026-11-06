import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p5-triangle-dimensions-from-enclosing-shapes',
  level: 5,
  title: 'Find triangle dimensions from nearby shapes',
  objective: 'Use rectangle and square properties to find a triangle base and perpendicular height, then calculate its area.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'triangle-dimensions-from-enclosing-shapes',
};

type Point = [number, number];
type Steps = NonNullable<Question['workedSteps']>;

function makeCanvas(width: number, height: number) {
  // Uniform scaling preserves square shapes and perpendicular distances.
  const scale = Math.min(188 / width, 110 / height);
  const left = (320 - width * scale) / 2 - 14;
  const marks: Batch11UpperMark[] = [];
  const screen = ([x, y]: Point): Point => [left + x * scale, 156 - y * scale];
  const line = (a: Point, b: Point, dashed = false) => {
    const [x1, y1] = screen(a);
    const [x2, y2] = screen(b);
    marks.push({ kind: 'line', x1, y1, x2, y2, dashed });
  };
  const label = (text: string, p: Point, dx: number, dy: number) => {
    const [x, y] = screen(p);
    marks.push({ kind: 'text', x: x + dx, y: y + dy, text });
  };
  const vertex = (name: string, p: Point, dx: number, dy: number) => {
    const [cx, cy] = screen(p);
    marks.push({ kind: 'circle', cx, cy, r: 1.7, fill: '#235b4c' });
    label(name, p, dx, dy);
  };
  const shade = (points: [Point, Point, Point]) => {
    const p = points.map(screen);
    marks.push({
      kind: 'path',
      d: `M ${p[0][0]} ${p[0][1]} L ${p[1][0]} ${p[1][1]} L ${p[2][0]} ${p[2][1]} Z`,
      fill: '#dcebd2',
    });
  };
  const box = (w: number, h: number) => {
    line([0, 0], [w, 0]);
    line([w, 0], [w, h]);
    line([w, h], [0, h]);
    line([0, h], [0, 0]);
  };
  const verticalMeasure = (top: Point, bottom: Point, value: number) => {
    const [x, y1] = screen(top);
    const [, y2] = screen(bottom);
    marks.push(
      { kind: 'line', x1: x + 10, y1, x2: x + 10, y2 },
      { kind: 'line', x1: x + 7, y1, x2: x + 13, y2: y1 },
      { kind: 'line', x1: x + 7, y1: y2, x2: x + 13, y2 },
      { kind: 'text', x: x + 17, y: (y1 + y2) / 2 + 6, text: `${value} cm` },
    );
  };
  return { marks, line, label, vertex, shade, box, verticalMeasure };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(0, 2);
  const finish = (
    triangle: string,
    context: string[],
    canvas: ReturnType<typeof makeCanvas>,
    answer: number,
    hint: string,
    workedSteps: Steps,
  ): Question => {
    const prompt = `What is the area of shaded triangle ${triangle}?`;
    const picture: Batch11UpperPicture = {
      type: 'batch11-upper',
      label: `${context.join(' ')} Triangle ${triangle} is shaded. Length labels are in centimetres.`,
      marks: canvas.marks,
    };
    return {
      key,
      prompt,
      context,
      picture,
      answer: String(answer),
      unit: 'cm²',
      hint,
      workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  };

  if (variant === 0) {
    const width = rng.pick([18, 24, 30]);
    const height = rng.pick([12, 14, 16]);
    const shortPart = rng.pick([6, 8]);
    const base = width - shortPart;
    const answer = base * height / 2;
    const c = makeCanvas(width, height);
    const K: Point = [0, height], L: Point = [width, height];
    const M: Point = [width, 0], N: Point = [0, 0], P: Point = [base, 0];
    c.shade([N, L, P]);
    c.box(width, height);
    c.vertex('K', K, -18, 6);
    c.vertex('L', L, 6, -7);
    c.vertex('M', M, 6, 18);
    c.vertex('N', N, -18, 6);
    c.vertex('P', P, -5, 18);
    c.label(`${width} cm`, [width / 2, height], -22, -20);
    c.label(`${height} cm`, [width, height / 2], 12, 6);
    c.label(`${shortPart} cm`, [(base + width) / 2, 0], -20, 38);
    return finish('NLP', [
      'KLMN is a rectangle, with K and L at the top. P lies on NM between N and M.',
      `KL = ${width} cm, LM = ${height} cm and PM = ${shortPart} cm.`,
    ], c, answer, 'Find NP by subtracting PM from the full bottom side. Then identify the perpendicular distance from L to that bottom line.', [
      { text: 'Opposite sides of a rectangle have equal lengths. Subtract PM to find NP.', equation: `NP = ${width} − ${shortPart} = ${base} cm` },
      { text: 'LM is perpendicular to line NP. Its foot is M, on the extension of NP.', equation: `Perpendicular height = LM = ${height} cm` },
      { text: 'Multiply the base by its perpendicular height, then halve the result.', equation: `${base} × ${height} ÷ 2 = ${answer} cm²` },
    ]);
  }

  if (variant === 1) {
    const breadth = rng.pick([3, 5, 6, 7, 8]);
    const length = 3 * breadth;
    const totalHeight = length + breadth;
    const answer = length * totalHeight / 2;
    const c = makeCanvas(length, totalHeight);
    const R: Point = [0, 0], S: Point = [breadth, totalHeight], T: Point = [length, 0];
    c.shade([R, S, T]);
    c.box(length, totalHeight);
    c.line([0, length], [length, length]);
    c.line([breadth, 0], [breadth, length]);
    c.line([2 * breadth, 0], [2 * breadth, length]);
    c.vertex('R', R, -18, 6);
    c.vertex('S', S, -5, -12);
    c.vertex('T', T, 6, 18);
    c.verticalMeasure([length, totalHeight], [length, length], breadth);
    return finish('RST', [
      'Four identical rectangles fit together with no gaps. Three stand side by side, and one lies across their top edges.',
      `Each small rectangle has breadth ${breadth} cm.`,
      'R and T are the bottom corners. S lies on the top edge.',
    ], c, answer, 'Count the three breadths along RT. The top rectangle shows the length of each upright rectangle.', [
      { text: 'The base RT contains three equal breadths.', equation: `RT = 3 × ${breadth} = ${length} cm` },
      { text: 'The rectangles are identical. The length of each upright rectangle equals the length across the top.', equation: `Length of one rectangle = ${length} cm` },
      { text: 'Add the breadth of the top rectangle to the height of the lower row.', equation: `Perpendicular height = ${length} + ${breadth} = ${totalHeight} cm` },
      { text: 'Use the complete base and perpendicular height of the triangle.', equation: `${length} × ${totalHeight} ÷ 2 = ${answer} cm²` },
    ]);
  }

  const smallSide = rng.pick([3, 5, 6, 7, 8]);
  const largeSide = 2 * smallSide;
  const width = largeSide + smallSide;
  const answer = largeSide * largeSide / 2;
  const c = makeCanvas(width, largeSide);
  const K: Point = [0, largeSide], L: Point = [largeSide, largeSide];
  const M: Point = [largeSide, 0], N: Point = [0, 0];
  const P: Point = [width, largeSide], R: Point = [width, 0];
  c.shade([N, M, P]);
  c.box(width, largeSide);
  c.line(M, L);
  c.line([largeSide, smallSide], [width, smallSide]);
  c.vertex('K', K, -18, 6);
  c.vertex('L', L, -5, -7);
  c.vertex('M', M, -5, 18);
  c.vertex('N', N, -18, 6);
  c.vertex('P', P, 6, -7);
  c.vertex('R', R, 6, 18);
  c.label(`${smallSide} cm`, [(largeSide + width) / 2, largeSide], -18, -23);
  return finish('NMP', [
    'KLMN is a square. Two identical small squares are stacked against its side LM, with no gaps.',
    `Each small square has side ${smallSide} cm.`,
    'P is the top-right corner of the upper small square. N, M and R lie on the same straight line.',
  ], c, answer, 'The two small squares give the full height of the large square. Use its bottom side as the triangle base.', [
    { text: 'Two small-square sides make one side of the large square.', equation: `LM = ${smallSide} + ${smallSide} = ${largeSide} cm` },
    { text: 'NM is an equal side of the large square. PR is the perpendicular height; its foot R lies beyond M.', equation: `Base NM = ${largeSide} cm; perpendicular height PR = ${largeSide} cm` },
    { text: 'Halve the product of the base and perpendicular height.', equation: `${largeSide} × ${largeSide} ÷ 2 = ${answer} cm²` },
  ]);
}
