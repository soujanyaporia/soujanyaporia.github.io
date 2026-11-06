import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-composite-perimeter-area-derived-lengths',
  level: 5,
  title: 'Find perimeter using area',
  objective: 'Use area and shared sides to recover missing lengths, then find the outside perimeter.',
  skillIds: ['P4.S.AREA.01', 'P4.S.AREA.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'p5-composite-perimeter-area-derived-lengths',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  // Consecutive indices alternate variants; the seed determines the starting variant.
  const joined = (hashString(`${RAG_PATTERN.id}:${seed}`) + index) % 2 === 0;
  const make = (
    prompt: string,
    answer: number,
    context: string[],
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
  ): Question => ({
    key,
    prompt,
    context,
    answer: String(answer),
    unit: 'cm',
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (joined) {
    const side = r.int(4, 12);
    const extra = r.pick([2, 4, 5, 6]);
    const rectangleLength = side + extra;
    const wholeLength = side + rectangleLength;
    const totalArea = side * wholeLength;
    const perimeter = 2 * (wholeLength + side);
    const pairs: string[] = [];
    for (let breadth = 1; breadth * breadth <= totalArea; breadth += 1) {
      if (totalArea % breadth === 0) pairs.push(`${breadth} × ${totalArea / breadth}`);
    }
    return make(
      'What is the perimeter of the larger rectangle?',
      perimeter,
      [
        'A square piece of card and a rectangular piece of card are placed side by side, without gaps or overlaps.',
        'Their shared edge is a full side of the square and the full breadth of the rectangle. Together they form one larger rectangle.',
        `The rectangle's length is ${extra} cm more than its breadth.`,
        `The total area of the two pieces is ${totalArea} cm².`,
      ],
      `Find factor pairs of the total area. The larger rectangle's length is two breadths plus ${extra} cm.`,
      [
        {
          text: 'The larger rectangle has the same breadth as the square. Its length includes the square and the rectangular piece.',
          equation: `Larger length = breadth + breadth + ${extra} cm`,
        },
        {
          text: 'List factor pairs of the total area. Try the smaller factor as the breadth and the larger factor as the length.',
          equation: `${totalArea} = ${pairs.join(' = ')}`,
        },
        {
          text: `Choose the pair whose length is two breadths plus ${extra} cm.`,
          equation: `2 × ${side} + ${extra} = ${wholeLength} cm; ${side} × ${wholeLength} = ${totalArea} cm²`,
        },
        {
          text: 'Add the two outside lengths and two outside breadths. The shared edge is inside the shape.',
          equation: `2 × (${wholeLength} + ${side}) = ${perimeter} cm`,
        },
      ],
    );
  }

  const side = r.pick([8, 12, 16, 20, 24]);
  const percentage = r.pick([25, 50, 75]);
  const squareArea = side * side;
  const rectangleArea = squareArea * percentage / 100;
  const breadth = rectangleArea / side;
  const perimeter = 2 * (side + breadth);
  return make(
    'What is the perimeter of this rectangle?',
    perimeter,
    [
      `A square sheet of card has an area of ${squareArea} cm².`,
      'One straight cut, parallel to a side, divides the sheet into two rectangles.',
      'Each rectangle has one side equal to a full side of the square.',
      `One of the rectangles has ${percentage}% of the square's area.`,
    ],
    'First find the side of the square. Then find the area of the chosen rectangle and divide by its known side.',
    [
      {
        text: 'Find the equal sides of the square using a multiplication fact.',
        equation: `${side} × ${side} = ${squareArea}, so each side is ${side} cm`,
      },
      {
        text: 'Find the area of the chosen rectangle.',
        equation: `${squareArea} × ${percentage} ÷ 100 = ${rectangleArea} cm²`,
      },
      {
        text: 'One side is a full side of the square. Divide the rectangle area by that side to find the other side.',
        equation: `${rectangleArea} ÷ ${side} = ${breadth} cm`,
      },
      {
        text: 'Add all four sides of the chosen rectangle.',
        equation: `2 × (${side} + ${breadth}) = ${perimeter} cm`,
      },
    ],
  );
}
