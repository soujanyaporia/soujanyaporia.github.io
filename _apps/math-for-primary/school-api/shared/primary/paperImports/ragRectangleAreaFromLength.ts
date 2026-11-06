import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rectangle-area-from-length',
  level: 3,
  title: 'Find the breadth, then the area',
  objective: 'Use the length and a stated multiple to work out the breadth of a rectangle, then find its area.',
  skillIds: ['P3.S.AREA.03', 'P3.S.MD.04', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-rectangle-area-from-side-lengths',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const factor = rng.pick([2, 3, 4]);
  const breadth = rng.pick([3, 5, 7, 8]);
  const length = breadth * factor;
  const area = length * breadth;
  const place = rng.pick(['courtyard', 'vegetable patch', 'playground']);
  const breadthEquation = `${length} ÷ ${factor} = ${breadth} m`;
  const areaEquation = `${length} × ${breadth} = ${area} m²`;

  return {
    key,
    context: [
      `A rectangular ${place} is ${length} m long.`,
      `Its length is ${factor} times its breadth.`,
    ],
    prompt: `What is the area of the ${place}?`,
    unit: 'm²',
    answer: String(area),
    hint: `Imagine the long side split into ${factor} equal parts. Each part is as long as the breadth.`,
    workedSteps: [
      { text: `Divide the length into ${factor} equal parts to find the breadth.`, equation: breadthEquation },
      { text: 'Multiply the length by the breadth to find the area.', equation: areaEquation },
    ],
    explanation: `The breadth is ${breadth} m because ${factor} × ${breadth} = ${length}. The area is ${areaEquation}.`,
  };
}
