import {Rng, hashString} from '../../engine/random';
import {fraction, type Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-equal-part-fraction-diagrams',
  level: 5,
  title: 'Fractions in shaded grids',
  objective: 'Use equal areas to find and simplify fractions of a whole or a stated reference area.',
  skillIds: ['P2.S.FRAC.01', 'P3.S.FRAC.02', 'P5.S.FRAC.01', 'P5.S.AREA.02'],
  canonicalPatternId: 'equal-part-fraction-diagrams',
} as const;

type AreaPicture = Extract<NonNullable<Question['picture']>, {
  type: 'batch9-early';
  layout: 'area-fraction';
}>;
type Point = AreaPicture['pieces'][number]['points'][number];
type Step = NonNullable<Question['workedSteps']>[number];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (hashString(String(seed)) + (index >>> 0)) % 3;
  const rows = r.pick([2, 3]);
  const columns = r.pick([4, 5]);
  const total = rows * columns;
  const relative = variant === 2;
  const askUnshaded = relative || (variant === 1 && r.chance(0.5));
  const halfSquares = variant === 0 ? r.pick([3, 5]) : 0;
  const fullSquares = variant === 0
    ? r.int(1, 2)
    : relative
      ? r.int(Math.floor(total / 2) + 1, total - 1)
      : r.int(1, total - 1);

  // Each cell is unshaded, half shaded or fully shaded.
  const cells = Array<number>(total).fill(0);
  const positions = r.shuffle(Array.from({length: total}, (_, i) => i));
  for (const cell of positions.slice(0, fullSquares)) cells[cell] = 2;
  for (const cell of positions.slice(fullSquares, fullSquares + halfSquares)) cells[cell] = 1;

  const pieces: AreaPicture['pieces'] = [];
  for (let cell = 0; cell < total; cell++) {
    const x = cell % columns;
    const y = Math.floor(cell / columns);
    const corners: Point[] = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const label = `Row ${y + 1}, column ${x + 1}`;

    if (cells[cell] === 1) {
      const triangles = r.chance(0.5)
        ? [[topLeft, topRight, bottomRight], [topLeft, bottomRight, bottomLeft]]
        : [[topLeft, topRight, bottomLeft], [topRight, bottomRight, bottomLeft]];
      const shadedSide = r.int(0, 1);
      triangles.forEach((points, part) => {
        pieces.push({
          label: `${label}, triangle ${part + 1}`,
          kind: 'triangle',
          points,
          shaded: part === shadedSide,
        });
      });
    } else {
      pieces.push({label, kind: 'square', points: corners, shaded: cells[cell] === 2});
    }
  }

  const picture: AreaPicture = {type: 'batch9-early', layout: 'area-fraction', pieces};
  const wholeUnits = variant === 0 ? total * 2 : total;
  const shadedUnits = variant === 0 ? fullSquares * 2 + halfSquares : fullSquares;
  const unshadedUnits = wholeUnits - shadedUnits;
  const numerator = askUnshaded ? unshadedUnits : shadedUnits;
  const denominator = relative ? shadedUnits : wholeUnits;
  const answer = fraction(numerator, denominator);
  const target = askUnshaded ? 'unshaded' : 'shaded';
  const prompt = relative
    ? 'Write the unshaded area as a fraction of the shaded area. Give the simplest form.'
    : `How much of the rectangle is ${target}? Write a fraction in simplest form.`;

  const steps: Step[] = variant === 0
    ? [
      {
        text: 'A diagonal divides a square into two equal triangles. Count in half-square units.',
        equation: `${total} × 2 = ${wholeUnits} half-square units in the whole rectangle`,
      },
      {
        text: 'Each fully shaded square counts as two units. Each shaded triangle counts as one.',
        equation: `${fullSquares} × 2 + ${halfSquares} = ${shadedUnits} shaded units`,
      },
    ]
    : [
      {text: 'Count all the equal squares.', equation: `${total} squares in the whole rectangle`},
      {text: 'Count the shaded squares.', equation: `${shadedUnits} shaded squares`},
    ];

  if (askUnshaded) {
    steps.push({
      text: 'Subtract the shaded amount to find the unshaded amount.',
      equation: `${wholeUnits} − ${shadedUnits} = ${unshadedUnits}`,
    });
  }
  steps.push({
    text: relative
      ? 'Compare the unshaded area with the shaded area.'
      : 'Compare the requested area with the whole rectangle.',
    equation: `${numerator} ÷ ${denominator} = ${numerator}/${denominator}`,
  });
  steps.push({text: 'Write the fraction in simplest form.', equation: `${numerator}/${denominator} = ${answer}`});

  return {
    key,
    prompt,
    context: [
      `All ${total} small squares have the same size.`,
      variant === 0
        ? 'Each sloping line runs between opposite corners of a small square.'
        : 'Every small square is either fully shaded or fully unshaded.',
    ],
    picture,
    answer,
    requireSimplified: true,
    hint: relative
      ? 'Count both groups. Use the shaded squares as the amount you compare with.'
      : variant === 0
        ? 'Use half a square as one equal area unit.'
        : 'Count all the squares and then count the squares asked for.',
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    proof: {op: '/', a: numerator, b: denominator},
  };
}
