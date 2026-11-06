import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-square-side-area-perimeter',
  level: 3,
  title: 'Find a square’s side from its area',
  objective: 'Use an equal-factor multiplication fact to find a side, then use all four sides when the perimeter is needed.',
  skillIds: ['P3.S.AREA.03', 'P3.S.AREA.02'],
  canonicalPatternId: 'p3-square-side-area-perimeter',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['garden', 'sheet', 'pieces']);
  const unit = form === 'garden' ? 'm' : 'cm';
  const side = form === 'pieces' ? rng.pick([4, 6, 10]) : rng.pick([3, 5, 6, 9, 10]);
  const area = side * side;
  const sideStep = {
    text: `A square has equal sides. This multiplication fact tells us that one side is ${side} ${unit} long.`,
    equation: `${side} × ${side} = ${area} ${unit}²`,
  };

  if (form === 'pieces') {
    const halfArea = area / 2;
    return {
      key,
      context: [
        'Asha fits 2 identical rectangular pieces of card together to make a square. There are no gaps or overlaps.',
        `Each piece has an area of ${halfArea} cm².`,
      ],
      prompt: 'How long is one side of Asha’s square in centimetres?',
      unit,
      answer: String(side),
      hint: 'Find the area of both pieces together. Which number times itself gives that area?',
      workedSteps: [
        { text: 'Add the areas of the two pieces to find the area of the square.', equation: `${halfArea} + ${halfArea} = ${area} cm²` },
        sideStep,
      ],
      explanation: `The two pieces cover ${area} cm² altogether. Since ${side} × ${side} = ${area}, each side of the square is ${side} cm long.`,
    };
  }

  const garden = form === 'garden';
  const perimeter = 4 * side;
  return {
    key,
    context: [garden ? `A square herb garden covers ${area} m².` : `A square sheet of paper has an area of ${area} cm².`],
    prompt: garden ? 'What is the perimeter of the garden in metres?' : 'What is the perimeter of the sheet in centimetres?',
    unit,
    answer: String(perimeter),
    ...(garden ? { choices: rng.shuffle([side, 2 * side, 3 * side, perimeter].map(String)) } : {}),
    hint: 'Which number times itself gives the area? Use that side length to find the distance around the square.',
    workedSteps: [
      sideStep,
      { text: 'Count all four sides to find the perimeter.', equation: `4 × ${side} = ${perimeter} ${unit}` },
    ],
    explanation: `${side} × ${side} = ${area}, so one side is ${side} ${unit} long. The four sides together measure ${perimeter} ${unit}.`,
  };
}
