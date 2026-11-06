import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-composite-area-components',
  level: 5,
  title: 'Find the area of joined shapes',
  objective: 'Use shared sides to find missing lengths, then add square and triangle areas.',
  skillIds: ['P4.S.AREA.01', 'P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-composite-area-from-components',
};

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = [number, number];
const polygon = (points: Point[]): Mark => ({
  kind: 'path',
  d: points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + ' Z',
  fill: '#edf5f1',
});
const label = (x: number, y: number, text: string): Mark => ({kind: 'text', x, y, text});

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const finish = (
    context: string[], answer: number, wrong: number[], hint: string,
    workedSteps: NonNullable<Question['workedSteps']>, picture: Diagram,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: 'What is the total area of the tile, in cm²?',
    context: [...context, 'The diagram is not drawn to scale.'],
    answer: String(answer),
    choices: r.shuffle([answer, ...wrong].map(String)),
    unit: 'cm²',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
    picture,
  });

  // Adjacent indices cover both variants; the seed controls their order and givens.
  if (((hashString(String(seed)) + index) & 1) === 0) {
    const side = r.pick([4, 5, 7, 8, 9, 10, 11, 12]);
    const base = r.pick([2, 4, 6, 8].filter(value => value < side));
    const square = side * side;
    const triangle = base * side / 2;
    const answer = square + 2 * triangle;
    const picture: Diagram = {
      type: 'batch11-upper',
      label: `Square QRST has QT ${side} cm. Identical right triangles PQT and RUS are joined to its left and right sides. PT is ${base} cm. P, T, S are collinear, as are Q, R, U. The right angles are at T and R. The pieces do not overlap.`,
      marks: [
        polygon([[110, 35], [220, 35], [220, 145], [110, 145]]),
        polygon([[55, 145], [110, 35], [110, 145]]),
        polygon([[220, 35], [275, 35], [220, 145]]),
        {kind: 'path', d: 'M 100 145 L 100 135 L 110 135'},
        {kind: 'path', d: 'M 230 35 L 230 45 L 220 45'},
        label(38, 161, 'P'), label(98, 26, 'Q'), label(213, 26, 'R'),
        label(216, 164, 'S'), label(103, 164, 'T'), label(280, 35, 'U'),
        label(117, 96, `${side} cm`), label(58, 190, `${base} cm`),
        {kind: 'line', x1: 55, y1: 174, x2: 110, y2: 174},
        {kind: 'line', x1: 55, y1: 170, x2: 55, y2: 178},
        {kind: 'line', x1: 110, y1: 170, x2: 110, y2: 178},
      ],
    };
    return finish([
      'A tile has a square QRST and two identical right-angled triangles, PQT and RUS. The pieces are joined without overlapping.',
      'P, T and S lie on one straight line. Q, R and U lie on another straight line.',
      `QT = ${side} cm and PT = ${base} cm.`,
    ], answer, [square, square + triangle, 2 * triangle],
    'Find the square area and the area of one triangle. Remember to include both triangles.', [
      {text: 'Every side of the square is the same length. Find its area.', equation: `${side} × ${side} = ${square} cm²`},
      {text: 'PT is perpendicular to QT. Use them as the base and height of triangle PQT.', equation: `${base} × ${side} ÷ 2 = ${triangle} cm²`},
      {text: 'The other triangle has the same area.', equation: `${triangle} × 2 = ${2 * triangle} cm²`},
      {text: 'Add the square and both triangles.', equation: `${square} + ${2 * triangle} = ${answer} cm²`},
    ], picture);
  }

  const largeSide = r.pick([7, 9, 10, 11, 12]);
  const smallSide = r.pick([2, 3, 4, 5].filter(value => largeSide * value % 2 === 0));
  const largeArea = largeSide * largeSide;
  const smallArea = smallSide * smallSide;
  const triangle = largeSide * smallSide / 2;
  const squares = largeArea + smallArea;
  const answer = squares + triangle;
  const picture: Diagram = {
    type: 'batch11-upper',
    label: `Square K has area ${largeArea} square centimetres and square L has area ${smallArea} square centimetres. Triangle M is below K and to the left of L. Its top side is the whole bottom side of K; its right side is the whole left side of L. These sides meet at a right angle. The pieces do not overlap.`,
    marks: [
      polygon([[65, 20], [160, 20], [160, 115], [65, 115]]),
      polygon([[160, 115], [225, 115], [225, 180], [160, 180]]),
      polygon([[65, 115], [160, 115], [160, 180]]),
      {kind: 'path', d: 'M 150 115 L 150 125 L 160 125'},
      label(105, 75, 'K'), label(185, 155, 'L'), label(126, 143, 'M'),
    ],
  };
  return finish([
    'A tile has two square pieces, K and L, and a triangular piece M. The three pieces are joined without overlapping.',
    `K has area ${largeArea} cm². L has area ${smallArea} cm².`,
    'The top side of M is the whole bottom side of K. The right side of M is the whole left side of L. These two sides of M meet at a right angle.',
  ], answer, [squares, triangle, squares + 2 * triangle],
  'Use multiplication facts to find each square side. These sides give the base and perpendicular height of M.', [
    {text: 'Find the length of a side of K.', equation: `${largeSide} × ${largeSide} = ${largeArea}, so a side of K is ${largeSide} cm`},
    {text: 'Find the length of a side of L.', equation: `${smallSide} × ${smallSide} = ${smallArea}, so a side of L is ${smallSide} cm`},
    {text: 'The shared sides are perpendicular. Find the area of M.', equation: `${largeSide} × ${smallSide} ÷ 2 = ${triangle} cm²`},
    {text: 'Add the areas of all three pieces.', equation: `${largeArea} + ${smallArea} + ${triangle} = ${answer} cm²`},
  ], picture);
}
