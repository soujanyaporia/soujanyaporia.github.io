import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-area-ratios-known-components',
  level: 5,
  title: 'Find related areas',
  objective: 'Use a known or calculated area and an area relationship to find a total, a component or a shaded remainder.',
  skillIds: ['P5.S.AREA.01', 'P5.S.AREA.02', 'P5.S.AREA.03', 'P5.S.FRAC.05'],
  canonicalPatternId: 'p5-area-ratios-known-component-areas',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isFinite(seed) || !Number.isFinite(index)) {
    throw new RangeError('Seed and index must be finite.');
  }
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((seed >>> 0) % 3 + (index >>> 0) % 3) % 3;
  const make = (
    context: string[],
    prompt: string,
    answer: number,
    hint: string,
    workedSteps: Steps,
  ): Question => ({
    key,
    context,
    prompt,
    answer: String(answer),
    unit: 'cm²',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  });

  if (variant === 0) {
    // A triangle contained in a rectangle cannot exceed half its area.
    const [numerator, denominator] = r.pick([
      [2, 5], [2, 7], [3, 7], [3, 8], [4, 9],
    ] as const);
    const partArea = r.pick([7, 9, 11, 13, 15, 17]);
    const triangleArea = numerator * partArea;
    const rectangleArea = denominator * partArea;
    const shadedArea = rectangleArea - triangleArea;
    return make(
      [
        'A triangle is drawn completely inside a rectangular card. The triangle is unshaded and the rest of the card is shaded.',
        `The triangle's area is ${numerator}/${denominator} of the area of the whole card.`,
        `The triangle has an area of ${triangleArea} cm².`,
      ],
      'What is the area of the shaded part of the card?',
      shadedArea,
      'Use the triangle to find one equal area part. Then find the whole card and subtract the triangle.',
      [
        {
          text: `The triangle represents ${numerator} equal area parts. Find one part.`,
          equation: `${triangleArea} ÷ ${numerator} = ${partArea} cm²`,
        },
        {
          text: `The whole card represents ${denominator} such parts.`,
          equation: `${partArea} × ${denominator} = ${rectangleArea} cm²`,
        },
        {
          text: 'Remove the unshaded triangle from the area of the card.',
          equation: `${rectangleArea} − ${triangleArea} = ${shadedArea} cm²`,
        },
      ],
    );
  }

  if (variant === 1) {
    const base = 2 * r.int(4, 9);
    const height = r.int(7, 19);
    const multiple = r.int(3, 5);
    const areaQ = base * height / 2;
    const areaP = multiple * areaQ;
    const total = areaP + areaQ;
    return make(
      [
        'P and Q are two separate triangular pieces of card.',
        `Triangle Q has a base of ${base} cm and a perpendicular height of ${height} cm.`,
        `The area of triangle P is ${multiple} times the area of triangle Q.`,
      ],
      'What is the total area of the two pieces?',
      total,
      'First use half × base × perpendicular height for Q. Then use the area multiple and add both areas.',
      [
        {
          text: 'Find the area of triangle Q.',
          equation: `${base} × ${height} ÷ 2 = ${areaQ} cm²`,
        },
        {
          text: `Triangle P has ${multiple} times this area.`,
          equation: `${multiple} × ${areaQ} = ${areaP} cm²`,
        },
        {
          text: 'Add the areas of the two separate pieces.',
          equation: `${areaP} + ${areaQ} = ${total} cm²`,
        },
      ],
    );
  }

  const [numerator, denominator] = r.pick([
    [1, 2], [2, 3], [2, 5], [3, 4], [3, 7], [4, 5],
  ] as const);
  const partArea = r.pick([5, 7, 11, 13, 17]);
  const parts = numerator + denominator;
  const total = parts * partArea;
  const areaQ = denominator * partArea;
  return make(
    [
      'A straight cut splits triangle ABC into two smaller triangles, P and Q. Together, P and Q cover ABC exactly, with no overlap.',
      `The area of triangle P is ${numerator}/${denominator} of the area of triangle Q.`,
      `Triangle ABC has an area of ${total} cm².`,
    ],
    'What is the area of triangle Q?',
    areaQ,
    'Represent the two areas using equal parts. Work out how many parts make the whole triangle.',
    [
      {
        text: `Represent P by ${numerator} equal area parts and Q by ${denominator} of the same parts. Count all the parts.`,
        equation: `${numerator} + ${denominator} = ${parts} parts`,
      },
      {
        text: 'Divide the whole area by the number of parts.',
        equation: `${total} ÷ ${parts} = ${partArea} cm²`,
      },
      {
        text: `Triangle Q has ${denominator} parts.`,
        equation: `${partArea} × ${denominator} = ${areaQ} cm²`,
      },
    ],
  );
}
