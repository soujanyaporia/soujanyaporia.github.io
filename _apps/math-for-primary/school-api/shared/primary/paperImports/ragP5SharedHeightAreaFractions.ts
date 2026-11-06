import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-shared-height-area-fractions',
  level: 5,
  title: 'Compare areas using a shared height',
  objective: 'Use equal base parts and a common perpendicular height to compare triangle areas and shaded shares.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03'],
  canonicalPatternId: 'p5-equal-part-and-shared-height-area-fractions',
};

type Diagram = Extract<NonNullable<Question['picture']>, {type: 'batch11-upper'}>;
type Mark = Diagram['marks'][number];
type Point = [number, number];
type Step = NonNullable<Question['workedSteps']>[number];
const polygon = (points: Point[], fill = 'none'): Mark => ({
  kind: 'path',
  d: points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z',
  fill,
});
const line = (a: Point, b: Point, dashed = false): Mark => ({
  kind: 'line', x1: a[0], y1: a[1], x2: b[0], y2: b[1], dashed,
});
const label = (text: string, x: number, y: number): Mark => ({kind: 'text', text, x, y});

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) >>> 0) + (index >>> 0)) % 2;
  const finish = (
    prompt: string, context: string[], answer: string, picture: Diagram,
    hint: string, steps: Step[], extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt, context, answer, picture, hint, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const multiple = r.pick([3, 4, 5, 6]);
    const baseUnit = r.pick([28, 32, 36]);
    const height = r.pick([90, 105, 120]);
    const S: Point = [40, 150];
    const P: Point = [40, 150 - height];
    const Q: Point = [40 + baseUnit, 150];
    const R: Point = [40 + baseUnit * (multiple + 1), 150];
    const answer = `${multiple}:${multiple + 1}`;
    const picture: Diagram = {
      type: 'batch11-upper',
      label: `Triangles PQR and PSR share vertex P. S, Q and R lie in that order on a straight line. PS is perpendicular to SR. QR is ${multiple} times SQ.`,
      marks: [
        line(P, S, true), line(S, Q, true), line(Q, R), line(P, Q), line(P, R),
        {kind: 'path', d: 'M 40 140 L 50 140 L 50 150'},
        label('P', P[0] - 17, P[1] - 6), label('S', S[0] - 6, 175),
        label('Q', Q[0] - 5, 175), label('R', R[0] - 5, 175),
      ],
    };
    return finish(
      'Which is the simplest ratio of the area of triangle PQR to the area of triangle PSR?',
      [
        'S, Q and R lie on one straight line, in that order. PS is perpendicular to SR.',
        `QR is ${multiple} times SQ.`,
        'The drawing is not to scale.',
      ],
      answer, picture,
      'Both triangles use PS as their perpendicular height. Compare their bases, QR and SR.',
      [
        {text: `Take SQ as 1 length unit. QR is then ${multiple} length units.`},
        {text: 'Add the two sections to find the whole base.', equation: `SR = 1 + ${multiple} = ${multiple + 1} length units`},
        {text: 'Both triangle areas use half the base multiplied by the same height PS. Their area ratio equals their base ratio.'},
        {text: 'Compare the smaller base with the whole base.', equation: `Area of PQR : area of PSR = ${multiple} : ${multiple + 1}`},
        {text: 'These consecutive whole numbers have no common factor greater than 1, so the ratio is already simplified.'},
      ],
      {choices: r.shuffle([answer, `${multiple + 1}:${multiple}`, `1:${multiple + 1}`, `${multiple}:1`])},
    );
  }

  const width = r.pick([200, 220, 240]);
  const left = (320 - width) / 2;
  const right = left + width;
  const top = r.pick([35, 40, 45]);
  const bottom = r.pick([145, 150, 155]);
  const P: Point = [left, top];
  const Q: Point = [left, bottom];
  const R: Point = [right, bottom];
  const S: Point = [right, top];
  const T: Point = [(left + right) / 2, bottom];
  const U: Point = [left + width * r.pick([0.25, 0.4, 0.65, 0.8]), top];
  const marks: Mark[] = [polygon([Q, T, U], '#c7dfd2'), polygon([P, Q, R, S])];
  for (const x of [left + width / 4, left + 3 * width / 4]) {
    marks.push(line([x - 3, bottom - 5], [x - 3, bottom + 5]));
    marks.push(line([x + 3, bottom - 5], [x + 3, bottom + 5]));
  }
  marks.push(
    label('P', left - 15, top - 8), label('Q', left - 15, bottom + 23),
    label('R', right + 3, bottom + 23), label('S', right + 3, top - 8),
    label('T', T[0] - 5, bottom + 23), label('U', U[0] - 5, top - 12),
  );
  return finish(
    'Give the ratio of the shaded area to the unshaded area in its simplest form. Enter the two ratio numbers in order.',
    [
      'PQRS is a rectangle. T is the midpoint of QR, so QT = TR.',
      'U lies on PS. Only triangle QTU is shaded.',
      'The drawing is not to scale.',
    ],
    JSON.stringify(['1', '3']),
    {type: 'batch11-upper', label: 'Rectangle PQRS with T at the midpoint of QR and U on the opposite side PS. Only triangle QTU is shaded. Matching marks show QT equals TR.', marks},
    'QT is half the rectangle base. The triangle uses the full height of the rectangle.',
    [
      {text: 'The midpoint splits QR into two equal lengths.', equation: 'QT is 1/2 of QR'},
      {text: 'A triangle is half a rectangle with the same base and height. Its base here is half the full rectangle base.', equation: 'Shaded fraction = 1/2 × 1/2 = 1/4'},
      {text: 'Subtract the shaded share from the whole.', equation: 'Unshaded fraction = 1 − 1/4 = 3/4'},
      {text: 'Compare the two shares and simplify.', equation: '1/4 : 3/4 = 1 : 3'},
    ],
    {structuredResponse: {kind: 'number-pair', firstLabel: 'Shaded area ratio number', secondLabel: 'Unshaded area ratio number'}},
  );
}
