import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rectangular-garden-border',
  level: 4,
  title: 'Find the area of a path and the perimeter of a lawn',
  objective: 'Use the width of a path on all four sides to find the area it covers and the distance around the lawn inside it.',
  skillIds: ['P4.S.AREA.02'],
  canonicalPatternId: 'rectangular-border-area-inner-perimeter',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const gardenLength = rng.int(25, 38);
  const gardenWidth = rng.int(14, 21);
  const pathWidth = rng.pick([2, 4, 5]);
  const lawnLength = gardenLength - 2 * pathWidth;
  const lawnWidth = gardenWidth - 2 * pathWidth;
  const gardenArea = gardenLength * gardenWidth;
  const lawnArea = lawnLength * lawnWidth;
  const pathArea = gardenArea - lawnArea;
  const lawnPerimeter = 2 * (lawnLength + lawnWidth);

  const workedSteps = [
    { text: 'Find the length of the lawn. There is a path at each end.', equation: `${gardenLength} − ${pathWidth} − ${pathWidth} = ${lawnLength} m` },
    { text: 'Find the width of the lawn. The path takes up space on both sides too.', equation: `${gardenWidth} − ${pathWidth} − ${pathWidth} = ${lawnWidth} m` },
    { text: 'Find the area of the whole garden.', equation: `${gardenLength} × ${gardenWidth} = ${gardenArea} m²` },
    { text: 'Find the area covered by grass.', equation: `${lawnLength} × ${lawnWidth} = ${lawnArea} m²` },
    { text: '(a) Take away the grass area to find the area covered by the path.', equation: `${gardenArea} − ${lawnArea} = ${pathArea} m²` },
    { text: '(b) Count two long sides and two short sides of the lawn.', equation: `2 × (${lawnLength} + ${lawnWidth}) = ${lawnPerimeter} m` },
  ];

  return {
    key,
    context: [
      `A rectangular garden measures ${gardenLength} m by ${gardenWidth} m.`,
      `A path runs just inside all four edges of the garden. It is ${pathWidth} m wide all the way round. The rest of the garden is a rectangular lawn.`,
    ],
    prompt: '(a) What area does the path cover?\n(b) What is the perimeter of the lawn?',
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Path area (m²)', secondLabel: '(b) Lawn perimeter (m)' },
    answer: JSON.stringify([String(pathArea), String(lawnPerimeter)]),
    hint: 'Imagine walking straight across the garden through the middle of the lawn. How many times would you cross the path?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
