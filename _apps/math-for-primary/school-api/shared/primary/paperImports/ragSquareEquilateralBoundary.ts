import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-square-equilateral-boundary',
  level: 6,
  title: 'Find the perimeter of a square and triangle',
  objective: 'Use equal sides and shared edges to find a composite perimeter.',
  skillIds: ['P6.S.SHAPE.01'],
  canonicalPatternId: 'p6-square-equilateral-boundary',
} as const;

const sideLengths = [6, 8, 10, 12, 14, 16];

export function makeRagQuestion(seed: number, index = 0): Question {
  // A repeatable mix of the two visible-givens forms.
  const key = Math.abs(Math.trunc(seed * 31 + index * 17));
  const side = sideLengths[key % sideLengths.length];
  const givenArea = Math.floor(key / sideLengths.length) % 2 === 1;
  const squareGiven = givenArea ? side * side : side;
  const answer = 5 * side;
  const prompt = givenArea
    ? `A square has an area of ${squareGiven} cm². An equilateral triangle is joined to one whole side of the square. Find the perimeter of the outside boundary.`
    : `A square has side length ${squareGiven} cm. An equilateral triangle is joined to one whole side of the square. Find the perimeter of the outside boundary.`;
  const workedSteps = givenArea
    ? [
        { text: 'The square side is the square root of its area.', equation: `√${squareGiven} = ${side} cm` },
        { text: 'The joined side is inside the figure. Three square sides and two triangle sides remain outside.', equation: `3 × ${side} + 2 × ${side} = ${answer} cm` },
      ]
    : [
        { text: 'The triangle side equals the square side because the triangle is equilateral and shares one whole square side.' },
        { text: 'The shared side is inside the figure. Three square sides and two triangle sides remain outside.', equation: `3 × ${side} + 2 × ${side} = ${answer} cm` },
      ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    context: ['The triangle shares exactly one whole side with the square. The shared side is not part of the outside boundary.'],
    answer: String(answer),
    unit: 'cm',
    hint: 'The joined side is inside the shape. Count only the sides on the outside.',
    explanation: workedSteps.map((step) => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    workedSteps,
  };
}
