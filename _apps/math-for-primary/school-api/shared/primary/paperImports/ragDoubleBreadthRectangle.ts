import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rectangle-double-breadth',
  level: 3,
  title: 'Find a rectangle’s length and area',
  objective: 'Use the distance around a rectangle and the relationship between its sides to find its length, then its area.',
  skillIds: ['P3.S.AREA.02', 'P3.S.AREA.03'],
  canonicalPatternId: 'rectangle-perimeter-double-breadth-to-length-and-area',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const breadth = rng.pick([2, 3, 4, 5, 6, 7, 8, 10]);
  const length = breadth * 2;
  const perimeter = 2 * (length + breadth);
  const area = length * breadth;
  const place = rng.pick(['garden', 'lawn', 'vegetable patch']);
  const workedSteps = [
    { text: 'Count one part for each short side and two parts for each long side. Going around all four sides gives six equal parts.', equation: '1 + 2 + 1 + 2 = 6' },
    { text: 'One part is the breadth.', equation: `${perimeter} ÷ 6 = ${breadth} m` },
    { text: '(a) The length is two of these parts.', equation: `2 × ${breadth} = ${length} m` },
    { text: '(b) Multiply the length by the breadth to find the area.', equation: `${length} × ${breadth} = ${area} m²` },
  ];

  return {
    key,
    context: [
      `The distance around a rectangular ${place} is ${perimeter} m.`,
      'Each long side is twice as long as a short side.',
    ],
    prompt: `(a) How long is one long side? (b) How many square metres does the ${place} cover?`,
    structuredResponse: { kind: 'number-pair', firstLabel: '(a) Length (m)', secondLabel: '(b) Area (m²)' },
    answer: JSON.stringify([String(length), String(area)]),
    hint: 'Imagine marking off pieces as long as the short side. How many pieces would fit around all four sides?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
}
