import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-ratio-partitioned-shaded-area',
  level: 5,
  title: 'Find areas using related lengths',
  objective: 'Use a known triangle area or related lengths to find missing dimensions and subtract shaded components.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-shaded-area-ratio-partitioned-dimensions',
};

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = [number, number];
type Step = NonNullable<Question['workedSteps']>[number];
const shade = '#c7dfd2';
const polygon = (points: Point[], fill = 'none'): Mark => ({
  kind: 'path',
  d: points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + ' Z',
  fill,
});
const line = (a: Point, b: Point): Mark => ({kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1]});
const text = (value: string, x: number, y: number): Mark => ({kind: 'text', text: value, x, y});

function rectangleDiagram(width: number, base: number, multiple: number): Diagram {
  const x = 40 + 240 * base / width;
  const P: Point = [40, 40], Q: Point = [280, 40], R: Point = [280, 140], S: Point = [40, 140];
  const T: Point = [x, 40], U: Point = [x, 40 + 100 / (multiple + 1)], V: Point = [x, 140];
  const W: Point = [40 + 480 * base / width, 140];
  const topTick = (P[0] + T[0]) / 2, bottomTick = (V[0] + W[0]) / 2;
  return {
    type: 'batch11-upper',
    label: 'Rectangle PQRS. T, U and V lie on a perpendicular from the top to the bottom. W lies between V and R. Only triangles PTU and UVW are shaded. Matching ticks show PT equals VW. Not to scale.',
    marks: [
      polygon([P, T, U], shade), polygon([U, V, W], shade), polygon([P, Q, R, S]),
      line(T, V), line([topTick, 35], [topTick, 45]), line([bottomTick, 135], [bottomTick, 145]),
      {kind: 'path', d: `M ${x - 8} 40 L ${x - 8} 48 L ${x} 48`},
      {kind: 'path', d: `M ${x} 132 L ${x + 8} 132 L ${x + 8} 140`},
      text('P', 34, 26), text('Q', 274, 26), text('R', 274, 166), text('S', 34, 166),
      text('T', x - 5, 26), text('U', x + 10, U[1] + 5), text('V', x - 5, 166), text('W', W[0] - 8, 166),
      text('Not to scale', 105, 194),
    ],
  };
}

function triangleDiagram(ad: number, cd: number, bf: number, ed: number, af: number): Diagram {
  const A: Point = [30, 140], C: Point = [276, 30], D: Point = [276, 140];
  const F: Point = [30 + 246 * af / ad, 140], E: Point = [30 + 246 * (ad - ed) / ad, 140];
  const B: Point = [F[0], 140 - 110 * bf / cd];
  return {
    type: 'batch11-upper',
    label: 'Triangle ACD has a right angle at D. A, F, E and D lie in order on its base. B lies on AC, directly above F. BF is perpendicular to AD. Region BCDE is shaded. Not to scale.',
    marks: [
      polygon([B, C, D, E], shade), polygon([A, C, D]), line(B, F), line(B, E),
      {kind: 'path', d: `M ${F[0] - 7} 140 L ${F[0] - 7} 133 L ${F[0]} 133`},
      {kind: 'path', d: 'M 269 140 L 269 133 L 276 133'},
      text('A', 24, 166), text('B', B[0] - 17, B[1] - 6), text('C', 270, 20),
      text('D', 270, 166), text('E', E[0] - 5, 166), text('F', F[0] - 5, 166),
      text('Not to scale', 105, 194),
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 2;
  const finish = (prompt: string, context: string[], answer: string, picture: Diagram, hint: string, steps: Step[], extra: Partial<Question> = {}): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, context, answer, picture, hint, unit: 'cm²', workedSteps: steps,
    explanation: steps.map(s => `${s.text} ${s.equation ?? ''}`).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const multiple = r.pick([2, 3, 4]);
    const tu = r.pick([4, 6, 8]), base = r.pick([14, 16, 18, 20, 22]);
    const height = tu * (multiple + 1), uv = height - tu;
    const width = 2 * base + r.pick([6, 8, 10]);
    const givenArea = base * tu / 2, otherArea = base * uv / 2, whole = width * height;
    return finish(
      'What is the total unshaded area of the rectangle?',
      [
        `PQRS is a rectangle. SR = ${width} cm; PS = ${height} cm.`,
        'T is on PQ. S, V, W and R lie in that order along SR. TV is perpendicular to SR, with U between T and V.',
        `PT = VW, and TU is 1/${multiple} of UV.`,
        `The shaded triangle PTU has an area of ${givenArea} cm². Only triangles PTU and UVW are shaded.`,
        'The diagram is not to scale.',
      ],
      String(whole - givenArea - otherArea), rectangleDiagram(width, base, multiple),
      'Think of TU as one equal part. Use the full height to find TU, then use the known triangle area to find PT.',
      [
        {text: `TU is one part and UV is ${multiple} parts. TV equals PS.`, equation: `TU = ${height} ÷ ${multiple + 1} = ${tu} cm`},
        {text: 'Find the remaining perpendicular height.', equation: `UV = ${height} − ${tu} = ${uv} cm`},
        {text: 'Double the known triangle area and divide by its height. VW has the same length as PT.', equation: `PT = VW = ${givenArea} × 2 ÷ ${tu} = ${base} cm`},
        {text: 'Find the other shaded triangle area.', equation: `Area of UVW = ${base} × ${uv} ÷ 2 = ${otherArea} cm²`},
        {text: 'Find the whole rectangle area.', equation: `${width} × ${height} = ${whole} cm²`},
        {text: 'Subtract both shaded triangles.', equation: `${whole} − ${givenArea} − ${otherArea} = ${whole - givenArea - otherArea} cm²`},
      ],
    );
  }

  const [numerator, denominator] = r.pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5]] as const);
  const horizontalUnit = r.pick([2, 4, 6]), verticalUnit = r.pick([1, 2, 3]), leftUnits = r.pick([4, 5, 6, 7]);
  const af = leftUnits * horizontalUnit, fe = numerator * horizontalUnit, ed = denominator * horizontalUnit;
  const ad = af + fe + ed, bf = leftUnits * verticalUnit, cd = (leftUnits + numerator + denominator) * verticalUnit;
  const firstArea = af * bf / 2, middleArea = fe * bf / 2, whole = ad * cd / 2;
  const shadedArea = whole - firstArea - middleArea;
  return finish(
    '(a) Find the area of triangle ABF. (b) Find the area of shaded region BCDE.',
    [
      'Triangle ACD has a right angle at D. A, F, E and D lie in that order on AD. B lies on AC, and BF is perpendicular to AD.',
      `AD = ${ad} cm; CD = ${cd} cm; BF = ${bf} cm; ED = ${ed} cm.`,
      `FE is ${numerator}/${denominator} of ED. Only region BCDE is shaded.`,
      'The diagram is not to scale.',
    ],
    JSON.stringify([String(firstArea), String(shadedArea)]), triangleDiagram(ad, cd, bf, ed, af),
    'Find FE from ED, then subtract FE and ED from AD. Both smaller triangles use BF as their perpendicular height.',
    [
      {text: 'Find the middle section of the base.', equation: `FE = ${ed} ÷ ${denominator} × ${numerator} = ${fe} cm`},
      {text: 'Find the base of triangle ABF.', equation: `AF = ${ad} − ${ed} − ${fe} = ${af} cm`},
      {text: 'Answer part (a) using AF and its perpendicular height BF.', equation: `${af} × ${bf} ÷ 2 = ${firstArea} cm²`},
      {text: 'Find the other unshaded triangle area.', equation: `Area of BFE = ${fe} × ${bf} ÷ 2 = ${middleArea} cm²`},
      {text: 'Find the enclosing triangle area.', equation: `Area of ACD = ${ad} × ${cd} ÷ 2 = ${whole} cm²`},
      {text: 'For part (b), subtract both unshaded triangles.', equation: `${whole} − ${firstArea} − ${middleArea} = ${shadedArea} cm²`},
    ],
    {structuredResponse: {kind: 'number-pair', firstLabel: '(a) Area of ABF (cm²)', secondLabel: '(b) Area of BCDE (cm²)'}},
  );
}
