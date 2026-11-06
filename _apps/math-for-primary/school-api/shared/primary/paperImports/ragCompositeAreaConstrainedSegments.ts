import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'rag-p5-composite-area-constrained-segments',
  level: 5,
  title: 'Find shaded areas from related lengths',
  objective: 'Use midpoints and side fractions to find missing lengths, then combine triangle areas.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03', 'P5.S.FRAC.05'],
  canonicalPatternId: 'composite-area-with-constrained-segments',
} as const;

type Point = [number, number];
type Step = NonNullable<Question['workedSteps']>[number];
const shade = '#d5e8d7';
const polygon = (points: Point[], fill = 'none'): Batch11UpperMark => ({
  kind: 'path',
  d: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ') + ' Z',
  fill,
});
const edge = (a: Point, b: Point): Batch11UpperMark => ({
  kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1],
});
const tag = (text: string, p: Point, dx: number, dy: number): Batch11UpperMark => ({
  kind: 'text', text, x: p[0] + dx, y: p[1] + dy,
});
function diagram(
  label: string,
  outline: Point[],
  shaded: Point[][],
  segments: [Point, Point][],
  labels: Batch11UpperMark[],
): Batch11UpperPicture {
  return {
    type: 'batch11-upper', label,
    marks: [
      ...shaded.map(points => polygon(points, shade)),
      ...segments.map(([a, b]) => edge(a, b)),
      polygon(outline),
      ...labels,
    ],
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 3;
  const finish = (
    prompt: string, context: string[], answer: number,
    picture: Batch11UpperPicture, hint: string, workedSteps: Step[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, context: [...context, 'The diagram is not to scale.'],
    answer: String(answer), unit: 'cm²', picture, hint, workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    const width = r.pick([28, 32, 40, 44, 48, 52]);
    const height = r.pick([12, 14, 16, 18, 22]);
    const shortTop = r.pick([4, 8, 10]);
    const halfBase = width / 2;
    const longTop = width - shortTop;
    const leftArea = halfBase * height / 2;
    const rightArea = longTop * height / 2;
    const A: Point = [36, 46], B: Point = [276, 46];
    const C: Point = [276, 146], D: Point = [36, 146];
    const E: Point = [36 + 240 * shortTop / width, 46], F: Point = [156, 146];
    const picture = diagram(
      'Rectangle ABCD with E on AB and F halfway along DC. Triangles DEF and EFB are shaded.',
      [A, B, C, D], [[D, E, F], [E, F, B]], [[D, E], [E, F], [F, B]],
      [tag('A', A, -14, -12), tag('B', B, 3, -12), tag('C', C, 3, 23),
       tag('D', D, -14, 23), tag('E', E, -5, -12), tag('F', F, -5, 23)],
    );
    return finish(
      'What is the total area of the two shaded triangles?',
      [
        'ABCD is a rectangle. E is on AB. F is the midpoint of DC, so DF = FC.',
        `AB = ${width} cm, BC = ${height} cm and AE = ${shortTop} cm.`,
        'Triangles DEF and EFB are shaded.',
      ],
      leftArea + rightArea, picture,
      'Find DF and EB. Each shaded triangle has a perpendicular height equal to BC.',
      [
        {text: 'F divides the bottom side into two equal lengths.', equation: `DF = ${width} ÷ 2 = ${halfBase} cm`},
        {text: 'Find the top side of triangle EFB.', equation: `EB = ${width} − ${shortTop} = ${longTop} cm`},
        {text: 'Use DF as the base of triangle DEF. Its height is BC.', equation: `${halfBase} × ${height} ÷ 2 = ${leftArea} cm²`},
        {text: 'Use EB as the base of triangle EFB. Its height is also BC.', equation: `${longTop} × ${height} ÷ 2 = ${rightArea} cm²`},
        {text: 'Add the two shaded areas.', equation: `${leftArea} + ${rightArea} = ${leftArea + rightArea} cm²`},
      ],
    );
  }

  if (variant === 1) {
    const [numerator, denominator] = r.pick([[2, 3], [3, 5], [4, 5]] as const);
    const unit = 2 * r.int(5, 9);
    const length = denominator * unit;
    const side = numerator * unit;
    const offset = 2 * r.int(Math.ceil(length / 6), Math.floor(length / 4));
    const topBase = side + offset;
    const squareTriangle = side * side / 2;
    const spanningTriangle = topBase * side / 2;
    const scale = 240 / (side + length);
    const A: Point = [36, 46], B: Point = [36 + side * scale, 46];
    const C: Point = [276, 46], D: Point = [276, 46 + side * scale];
    const E: Point = [B[0], D[1]], F: Point = [36, D[1]];
    const G: Point = [B[0] + offset * scale, 46];
    const picture = diagram(
      'Square ABEF and rectangle BCDE share side BE. G lies on BC. Triangles AFE and AGD are shaded.',
      [A, C, D, F], [[A, F, E], [A, G, D]], [[B, E], [A, E], [A, D], [G, D]],
      [tag('A', A, -14, -12), tag('B', B, -5, -12), tag('C', C, 3, -12),
       tag('D', D, 3, 23), tag('E', E, -5, 23), tag('F', F, -14, 23), tag('G', G, -5, -12)],
    );
    return finish(
      'Find the total area of the shaded triangles AFE and AGD.',
      [
        'Square ABEF and rectangle BCDE share side BE. A, B, G and C lie on the same straight top edge, in that order. F, E and D lie on the bottom edge.',
        `ED = ${length} cm and BG = ${offset} cm.`,
        `AB = ${numerator}/${denominator} of ED.`,
        'Only triangles AFE and AGD are shaded.',
      ],
      squareTriangle + spanningTriangle, picture,
      'First find the side of the square. Then find AG and use the common height of the two shapes.',
      [
        {text: 'Use the fraction to find the side of the square.', equation: `AB = ${length} ÷ ${denominator} × ${numerator} = ${side} cm`},
        {text: 'AG includes AB and BG.', equation: `AG = ${side} + ${offset} = ${topBase} cm`},
        {text: 'Triangle AFE is half of the square.', equation: `${side} × ${side} ÷ 2 = ${squareTriangle} cm²`},
        {text: 'Triangle AGD has base AG and perpendicular height equal to the square side.', equation: `${topBase} × ${side} ÷ 2 = ${spanningTriangle} cm²`},
        {text: 'The shaded triangles do not overlap. Add their areas.', equation: `${squareTriangle} + ${spanningTriangle} = ${squareTriangle + spanningTriangle} cm²`},
      ],
    );
  }

  const topDenominator = r.pick([3, 4, 6]);
  const rightDenominator = r.pick([3, 5, 6]);
  const width = 2 * topDenominator * r.int(9, 12);
  const height = 2 * rightDenominator * r.int(3, 4);
  const ae = width / topDenominator;
  const df = height / rightDenominator;
  const ed = width - ae, fc = height - df;
  const halfWidth = width / 2, halfHeight = height / 2;
  const largeTriangle = width * height / 2;
  const aeo = ae * halfHeight / 2;
  const edf = ed * df / 2;
  const fco = fc * halfWidth / 2;
  const answer = largeTriangle - aeo - edf - fco;
  const A: Point = [36, 46], D: Point = [276, 46];
  const C: Point = [276, 146], B: Point = [36, 146];
  const E: Point = [36 + 240 / topDenominator, 46];
  const F: Point = [276, 46 + 100 / rightDenominator], O: Point = [156, 96];
  const picture = diagram(
    'Rectangle ABCD with centre O on diagonal AC. E lies on AD and F lies on DC. Triangle EFO is shaded.',
    [A, D, C, B], [[E, F, O]], [[A, C], [E, F], [E, O], [F, O]],
    [tag('A', A, -14, -12), tag('B', B, -14, 23), tag('C', C, 3, 23),
     tag('D', D, 3, -12), tag('E', E, -5, -12), tag('F', F, 10, 5), tag('O', O, -8, 22)],
  );
  return finish(
    'What is the area of the shaded triangle EFO?',
    [
      'O is the centre of rectangle ABCD and lies on diagonal AC. E is on AD and F is on DC.',
      `BC = ${width} cm and AB = ${height} cm.`,
      `AE = 1/${topDenominator} of AD and DF = 1/${rightDenominator} of DC.`,
      'The centre is halfway between each pair of opposite sides. Only triangle EFO is shaded.',
    ],
    answer, picture,
    'Find the area of triangle ACD, then subtract the three unshaded triangles inside it.',
    [
      {text: 'Use the side fractions to find AE and DF.', equation: `AE = ${width} ÷ ${topDenominator} = ${ae} cm; DF = ${height} ÷ ${rightDenominator} = ${df} cm`},
      {text: 'Find the remaining parts of the top and right sides.', equation: `ED = ${width} − ${ae} = ${ed} cm; FC = ${height} − ${df} = ${fc} cm`},
      {text: 'The distances from O to the top and right sides are half the corresponding rectangle dimensions.', equation: `To AD: ${height} ÷ 2 = ${halfHeight} cm; to DC: ${width} ÷ 2 = ${halfWidth} cm`},
      {text: 'Triangle ACD has base AD and perpendicular height DC.', equation: `${width} × ${height} ÷ 2 = ${largeTriangle} cm²`},
      {text: 'Find the unshaded triangle AEO using base AE.', equation: `${ae} × ${halfHeight} ÷ 2 = ${aeo} cm²`},
      {text: 'Find the unshaded right-angled triangle EDF.', equation: `${ed} × ${df} ÷ 2 = ${edf} cm²`},
      {text: 'Find the unshaded triangle FCO using base FC.', equation: `${fc} × ${halfWidth} ÷ 2 = ${fco} cm²`},
      {text: 'Remove all three unshaded areas from triangle ACD.', equation: `${largeTriangle} − ${aeo} − ${edf} − ${fco} = ${answer} cm²`},
    ],
  );
}
