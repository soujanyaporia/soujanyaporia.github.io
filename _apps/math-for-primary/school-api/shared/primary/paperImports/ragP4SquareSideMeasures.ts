import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-square-side-measures',
  level: 4,
  title: 'Find a missing length on a square',
  objective: 'Find one side from a square’s perimeter or area, then use it to find a perimeter or the remaining part of an edge.',
  skillIds: ['P4.S.AREA.01'],
  canonicalPatternId: 'p4-square-side-from-perimeter-or-area-and-related-lengths',
};

const forms = ['perimeter-entry', 'perimeter-choice', 'side-from-area', 'perimeter-from-area', 'edge-segment'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(forms);
  const base = { key, unit: 'cm' };

  if (form === 'perimeter-entry' || form === 'perimeter-choice') {
    const side = rng.int(10, 24);
    const perimeter = 4 * side;
    return {
      ...base,
      context: [`A square tile has a perimeter of ${perimeter} cm.`],
      prompt: 'How many centimetres long is one edge of the tile?',
      answer: String(side),
      ...(form === 'perimeter-choice' ? {
        choices: rng.shuffle([side, side + 1, perimeter / 2, perimeter].map(String)),
      } : {}),
      hint: 'How many equal edges share the distance around the tile?',
      workedSteps: [
        { text: 'Divide the distance around the tile equally among its four edges.', equation: `${perimeter} ÷ 4 = ${side} cm` },
        { text: 'Check that the four edges give the stated perimeter.', equation: `4 × ${side} cm = ${perimeter} cm` },
      ],
      explanation: `The four edges are equal. Each edge is ${perimeter} ÷ 4 = ${side} cm long.`,
    };
  }

  const side = rng.pick([5, 6, 7, 10, 11, 12]);
  const area = side * side;
  const context = [`A square tile covers ${area} cm².`];
  const sideStep = {
    text: `The tile is as long as it is wide. Each edge is ${side} cm long because this multiplication gives its area.`,
    equation: `${side} cm × ${side} cm = ${area} cm²`,
  };

  if (form === 'side-from-area') {
    return {
      ...base, context,
      prompt: 'How many centimetres long is one edge of the tile?',
      answer: String(side),
      hint: 'Which number gives the area when you multiply it by itself?',
      workedSteps: [sideStep],
      explanation: `${side} × ${side} = ${area}, so one edge measures ${side} cm.`,
    };
  }

  if (form === 'perimeter-from-area') {
    const perimeter = 4 * side;
    return {
      ...base, context,
      prompt: 'What is the perimeter of the tile in centimetres?',
      answer: String(perimeter),
      hint: 'Use the area to find one edge. How many of those edges go around the tile?',
      workedSteps: [sideStep, { text: 'Count all four equal edges.', equation: `4 × ${side} cm = ${perimeter} cm` }],
      explanation: `Each edge measures ${side} cm because ${side} × ${side} = ${area}. The perimeter is 4 × ${side} = ${perimeter} cm.`,
    };
  }

  const marked = rng.int(3, Math.ceil(side / 2));
  const remaining = side - marked;
  return {
    ...base,
    context: [...context, 'There is a mark at M on the top edge of the tile. The bar shows that whole edge from A to B.'],
    picture: {
      type: 'paper', layout: 'bars',
      rows: [{ label: 'Edge AB', parts: [
        { size: marked, label: `AM = ${marked} cm`, tone: 'blue' },
        { size: remaining, label: 'MB = ? cm', tone: 'orange' },
      ] }],
    },
    prompt: 'How long is MB in centimetres?',
    answer: String(remaining),
    hint: 'Find the length of the whole edge using the area. Which part of that edge do you already know?',
    workedSteps: [sideStep, { text: 'Take AM away from the whole edge AB to find MB.', equation: `${side} cm − ${marked} cm = ${remaining} cm` }],
    explanation: `The whole edge AB measures ${side} cm. AM takes up ${marked} cm of it, so MB measures ${remaining} cm.`,
  };
}
