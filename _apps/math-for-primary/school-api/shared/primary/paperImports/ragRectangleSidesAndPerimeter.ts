import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rectangle-sides-and-perimeter',
  level: 3,
  title: 'Find a card’s length and area',
  objective: 'Use the distance around a rectangle and its breadth to find its length, then use both sides to find its area.',
  skillIds: ['P3.S.AREA.02', 'P3.S.AREA.03'],
  canonicalPatternId: 'p3-rectangle-sides-and-perimeter',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const breadth = rng.int(3, 8);
  const length = rng.int(17, 38);
  const halfPerimeter = length + breadth;
  const perimeter = 2 * halfPerimeter;
  const area = length * breadth;

  return {
    key,
    context: [
      `A ${perimeter} cm strip of tape goes once around the edge of a rectangular card. Its ends just meet.`,
      `The card is ${breadth} cm wide.`,
    ],
    prompt: '(a) How long is the card? (b) What is the area of the card?',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Length (cm)',
      secondLabel: '(b) Area (cm²)',
    },
    answer: JSON.stringify([String(length), String(area)]),
    hint: 'The tape covers two long sides and two short sides. What does half the tape cover?',
    workedSteps: [
      {
        text: 'One long side and one short side make up half the distance around the card.',
        equation: `${perimeter} ÷ 2 = ${halfPerimeter} cm`,
      },
      {
        text: '(a) Subtract the width to find the length of the card.',
        equation: `${halfPerimeter} − ${breadth} = ${length} cm`,
      },
      {
        text: '(b) Multiply the length by the width to find how many square centimetres the card covers.',
        equation: `${length} × ${breadth} = ${area} cm²`,
      },
    ],
    explanation: `One long edge and one short edge together measure ${halfPerimeter} cm. The short edge is ${breadth} cm, so the long edge is ${length} cm. The card covers ${area} cm².`,
  };
}
